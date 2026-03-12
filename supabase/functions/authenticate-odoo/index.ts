import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface AuthRequest {
  tenant_slug: string
  email: string
  password: string
}

async function callOdooRpc(
  odoo_url: string,
  database: string,
  service: string,
  method: string,
  args: any[]
): Promise<any> {
  const url = `${odoo_url.replace(/\/$/, '')}/jsonrpc`
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: { service, method, args },
    id: Math.random(),
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Odoo API error: ${response.status}`)
  const result = await response.json()
  if (result.error) throw new Error(result.error.data?.message || result.error.message || 'Odoo error')
  return result.result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const body = await req.json() as AuthRequest
    const { tenant_slug, email, password } = body

    if (!tenant_slug || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', tenant_slug)
      .eq('status', 'active')
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const uid = await callOdooRpc(
      tenant.odoo_url,
      tenant.odoo_database,
      'common',
      'authenticate',
      [tenant.odoo_database, email, password, {}]
    )

    if (!uid || uid === false) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        uid,
        tenant_id: tenant.id,
        tenant_slug: tenant.subdomain,
        odoo_url: tenant.odoo_url,
        odoo_database: tenant.odoo_database,
        has_custom_time_fields: tenant.has_custom_time_fields,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (error) {
    console.error('Authentication error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Authentication failed' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})

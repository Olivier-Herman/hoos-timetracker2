import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface OdooCallRequest {
  tenant_slug: string
  email: string
  password: string
  model: string
  method: string
  args?: any[]
  kwargs?: any
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
    const body = await req.json() as OdooCallRequest
    const { tenant_slug, email, password, model, method, args = [], kwargs = {} } = body

    if (!tenant_slug || !email || !password || !model || !method) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tenant_slug, email, password, model, method' }),
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

    if (!uid || uid === false) throw new Error('Invalid credentials')

    const result = await callOdooRpc(
      tenant.odoo_url,
      tenant.odoo_database,
      'object',
      'execute_kw',
      [tenant.odoo_database, uid, password, model, method, args, kwargs]
    )

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (error) {
    console.error('Odoo call error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Call failed' }),
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

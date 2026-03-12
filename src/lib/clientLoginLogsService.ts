import { supabase, ClientLoginLog } from './supabaseClient'

export async function logClientAction(
  tenantId: string,
  tenantSubdomain: string,
  userEmail: string,
  action: string,
  actionType?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('client_login_logs').insert({
      tenant_id: tenantId,
      tenant_subdomain: tenantSubdomain,
      user_email: userEmail,
      action,
      action_type: actionType || null,
      details: details || {},
    })
  } catch (err) {
    console.error('Failed to log client action:', err)
  }
}

export async function fetchClientLogs(tenantId?: string, limit = 100): Promise<ClientLoginLog[]> {
  let query = supabase
    .from('client_login_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as ClientLoginLog[]
}

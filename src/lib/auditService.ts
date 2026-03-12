import { supabase, AuditLog } from './supabaseClient'

export async function logAudit(
  adminEmail: string,
  action: string,
  tenantId?: string,
  tenantSubdomain?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      admin_email: adminEmail,
      action,
      tenant_id: tenantId || null,
      tenant_subdomain: tenantSubdomain || null,
      details: details || {},
    })
  } catch (err) {
    console.error('Failed to log audit:', err)
  }
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as AuditLog[]
}

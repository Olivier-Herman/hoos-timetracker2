import { supabase, Tenant } from './supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * Check if tenant is valid (active, not expired)
 */
export function isTenantValid(tenant: Tenant): boolean {
  if (tenant.status !== 'active') return false

  // Check trial expiry
  if (tenant.is_trial && tenant.trial_expires_at) {
    const expires = new Date(tenant.trial_expires_at)
    if (expires < new Date()) return false
  }

  // Check validity date
  if (tenant.validity_date) {
    const validity = new Date(tenant.validity_date)
    if (validity < new Date()) return false
  }

  return true
}

/**
 * Encrypt API key using Supabase edge function or simple base64 (fallback)
 * In production you'd use AES encryption via edge function
 */
export function encryptApiKey(key: string): string {
  return btoa(key)
}

export function decryptTenantApiKey(encryptedKey: string): string {
  try {
    return atob(encryptedKey)
  } catch {
    return encryptedKey
  }
}

/**
 * Fetch all tenants (admin use)
 */
export async function fetchAllTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Tenant[]
}

/**
 * Create a new tenant
 */
export async function createTenant(tenantData: Omit<Tenant, 'id' | 'created_at'>): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .insert(tenantData)
    .select()
    .single()

  if (error) throw error
  return data as Tenant
}

/**
 * Update a tenant
 */
export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

/**
 * Suspend a tenant
 */
export async function suspendTenant(id: string): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'suspended', suspended_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

/**
 * Reactivate a tenant
 */
export async function reactivateTenant(id: string): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'active', suspended_at: null })
    .eq('id', id)

  if (error) throw error
}

/**
 * Soft-delete a tenant
 */
export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

/**
 * Verify Odoo credentials via Edge Function
 */
export async function verifyOdooCredentials(
  odoo_url: string,
  database: string,
  email: string,
  api_key: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${SUPABASE_URL}/functions/v1/verify-odoo-credentials`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ odoo_url, database, email, api_key }),
  })
  return response.json()
}

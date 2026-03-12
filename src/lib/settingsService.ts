import { supabase, GlobalSettings, TenantSettings } from './supabaseClient'

export async function initializeSettings(): Promise<void> {
  // Ensure global settings row exists
  const { data } = await supabase.from('global_settings').select('id').limit(1).single()
  if (!data) {
    await supabase.from('global_settings').insert({
      show_maintenance_banner: false,
      maintenance_message: '',
    })
  }
}

export async function getGlobalSettings(): Promise<GlobalSettings | null> {
  const { data, error } = await supabase
    .from('global_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) return null
  return data as GlobalSettings
}

export async function updateGlobalSettings(updates: Partial<GlobalSettings>): Promise<void> {
  const { data } = await supabase.from('global_settings').select('id').limit(1).single()
  if (!data) throw new Error('Global settings not found')

  const { error } = await supabase
    .from('global_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', data.id)

  if (error) throw error
}

export async function getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error) return null
  return data as TenantSettings
}

export async function upsertTenantSettings(
  tenantId: string,
  updates: Partial<TenantSettings>
): Promise<void> {
  const existing = await getTenantSettings(tenantId)

  if (existing) {
    const { error } = await supabase
      .from('tenant_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('tenant_settings')
      .insert({ tenant_id: tenantId, ...updates })
    if (error) throw error
  }
}

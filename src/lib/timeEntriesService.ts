import { supabase, TimeEntry } from './supabaseClient'
import { getTenantFromSession } from './multiTenantUtils'

export interface TimeEntryLocal {
  id?: string
  odoo_entry_id?: number
  start_time?: string
  end_time?: string
  hours?: number
  entry_date: string
  description: string
}

export async function createLocalTimeEntry(entry: TimeEntryLocal): Promise<string | null> {
  const tenant = getTenantFromSession()
  if (!tenant) throw new Error('No tenant session found')

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      tenant_id: tenant.tenant_id,
      odoo_entry_id: entry.odoo_entry_id,
      start_time: entry.start_time,
      end_time: entry.end_time,
      hours: entry.hours,
      entry_date: entry.entry_date,
      description: entry.description,
    })
    .select('id')
    .single()

  if (error) throw error
  return data?.id || null
}

export async function updateLocalTimeEntry(supabaseId: string, entry: Partial<TimeEntryLocal>): Promise<void> {
  const { error } = await supabase
    .from('time_entries')
    .update({
      odoo_entry_id: entry.odoo_entry_id,
      start_time: entry.start_time,
      end_time: entry.end_time,
      hours: entry.hours,
      description: entry.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supabaseId)

  if (error) throw error
}

export async function getLocalTimeEntryByOdooId(odooId: number): Promise<TimeEntry | null> {
  const tenant = getTenantFromSession()
  if (!tenant) return null

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('tenant_id', tenant.tenant_id)
    .eq('odoo_entry_id', odooId)
    .single()

  if (error || !data) return null
  return data as TimeEntry
}

export async function deleteLocalTimeEntry(supabaseId: string): Promise<void> {
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', supabaseId)

  if (error) throw error
}

export async function getLocalTimeEntries(startDate: string, endDate: string): Promise<TimeEntry[]> {
  const tenant = getTenantFromSession()
  if (!tenant) return []

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('tenant_id', tenant.tenant_id)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: false })

  if (error) throw error
  return data as TimeEntry[]
}

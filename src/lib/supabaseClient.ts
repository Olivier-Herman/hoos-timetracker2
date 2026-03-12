import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Tenant {
  id: string
  subdomain: string
  company_name: string
  company_vat_number?: string
  odoo_url: string
  odoo_database: string
  api_key_encrypted: string
  admin_email: string
  odoo_user_email?: string
  status: 'active' | 'suspended' | 'deleted'
  plan?: string
  is_trial?: boolean
  trial_expires_at?: string
  validity_date?: string
  has_custom_time_fields?: boolean
  created_at: string
  suspended_at?: string
  deleted_at?: string
}

export interface AdminUser {
  id: string
  email: string
  password_hash: string
  created_at: string
  last_login?: string
}

export interface AuditLog {
  id: string
  admin_email: string
  action: string
  tenant_id?: string
  tenant_subdomain?: string
  details?: Record<string, any>
  created_at: string
}

export interface TimeEntry {
  id?: string
  tenant_id: string
  odoo_entry_id?: number
  start_time?: string
  end_time?: string
  hours?: number
  entry_date: string
  description: string
  created_at?: string
  updated_at?: string
}

export interface GlobalSettings {
  id: string
  show_maintenance_banner: boolean
  maintenance_message: string
  created_at: string
  updated_at: string
}

export interface TenantSettings {
  id: string
  tenant_id: string
  show_message_banner: boolean
  message_banner: string
  created_at: string
  updated_at: string
}

export interface ClientLoginLog {
  id: string
  tenant_id: string
  tenant_subdomain: string
  user_email: string
  action: string
  action_type?: string
  login_time: string
  details?: Record<string, any>
  created_at: string
}

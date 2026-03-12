import { supabase, Tenant } from './supabaseClient'

// Session storage key
const SESSION_KEY = 'tenant_session'

export interface TenantSession {
  tenant_id: string
  tenant_slug: string
  odoo_url: string
  odoo_database: string
  user_email: string
  password: string
  uid: number
  has_custom_time_fields?: boolean
  logged_in_at: string
}

/**
 * Get the tenant slug from the URL path.
 * URL format: https://pointages.hoos.cloud/{slug}/...
 * or locally: http://localhost:5173/{slug}/...
 */
export function getTenantSlug(): string {
  const pathname = window.location.pathname
  // Split path and get first segment
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return ''
  const first = segments[0]
  // Reserved routes
  if (['admin', 'onboarding', 'app'].includes(first)) return ''
  return first
}

/**
 * Check if current route is admin
 */
export function isAdminRoute(): boolean {
  const pathname = window.location.pathname
  return pathname.startsWith('/admin')
}

/**
 * Check if current route is onboarding
 */
export function isOnboardingRoute(): boolean {
  return window.location.pathname === '/onboarding'
}

/**
 * Fetch tenant by slug from Supabase
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', slug)
      .neq('status', 'deleted')
      .single()

    if (error || !data) return null
    return data as Tenant
  } catch {
    return null
  }
}

/**
 * Store tenant session in localStorage
 */
export function setTenantSession(
  tenant_id: string,
  tenant_slug: string,
  odoo_url: string,
  odoo_database: string,
  user_email: string,
  password: string,
  uid: number,
  _unused?: any,
  has_custom_time_fields?: boolean
): void {
  const session: TenantSession = {
    tenant_id,
    tenant_slug,
    odoo_url,
    odoo_database,
    user_email,
    password,
    uid,
    has_custom_time_fields,
    logged_in_at: new Date().toISOString(),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

/**
 * Get current tenant session from localStorage
 */
export function getTenantFromSession(): TenantSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TenantSession
  } catch {
    return null
  }
}

/**
 * Clear tenant session
 */
export function clearTenantSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

/**
 * Navigate to a tenant's app path
 */
export function getTenantAppPath(slug: string): string {
  return `/${slug}/app`
}

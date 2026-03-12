import { getTenantFromSession, getTenantBySlug } from './multiTenantUtils'
import { logClientAction } from './clientLoginLogsService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const EDGE_AUTH_URL = `${SUPABASE_URL}/functions/v1/authenticate-odoo`
const EDGE_CALL_URL = `${SUPABASE_URL}/functions/v1/call-odoo`

let lastAPICallTime = 0
const MIN_API_DELAY = 500

export async function getOdooUrlFromSession(): Promise<{ url: string; database: string }> {
  const tenant = getTenantFromSession()
  if (!tenant) throw new Error('Tenant not found in session')
  if (!tenant.odoo_database) throw new Error('Odoo database not found in session')
  return { url: tenant.odoo_url, database: tenant.odoo_database }
}

async function callOdooViaEdgeFunction(
  tenant_slug: string,
  email: string,
  password: string,
  model: string,
  method: string,
  args: any[],
  kwargs: any
): Promise<any> {
  const timeSinceLastCall = Date.now() - lastAPICallTime
  if (timeSinceLastCall < MIN_API_DELAY) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_DELAY - timeSinceLastCall))
  }
  lastAPICallTime = Date.now()

  const response = await fetch(EDGE_CALL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_slug, email, password, model, method, args, kwargs }),
  })

  const result = await response.json()
  if (!result.success && result.error) {
    throw new Error(result.error)
  }
  return result.result
}

export async function authenticateUserMultiTenant(
  username: string,
  password: string,
  tenant_slug: string
): Promise<any> {
  const response = await fetch(EDGE_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_slug, email: username, password }),
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Authentication failed')
  }

  const tenant = await getTenantBySlug(tenant_slug)
  const tenantId = result.tenant_id || tenant?.id || ''

  // Log successful login
  await logClientAction(tenantId, tenant_slug, username, 'client_login', 'login', {
    uid: result.uid,
  })

  return {
    ...result,
    has_custom_time_fields: tenant?.has_custom_time_fields ?? true,
  }
}

// ── Time entries ─────────────────────────────────────────────────────────────

export async function getTimeEntries(
  startDate: string,
  endDate: string
): Promise<any[]> {
  const session = getTenantFromSession()
  if (!session) throw new Error('Not authenticated')

  return callOdooViaEdgeFunction(
    session.tenant_slug,
    session.user_email,
    session.password,
    'account.analytic.line',
    'search_read',
    [[
      ['date', '>=', startDate],
      ['date', '<=', endDate],
      ['user_id.login', '=', session.user_email],
    ]],
    {
      fields: ['id', 'name', 'date', 'unit_amount', 'project_id', 'task_id', 'x_start_time', 'x_end_time'],
      order: 'date desc',
    }
  )
}

export async function createTimeEntry(entry: {
  name: string
  date: string
  unit_amount: number
  project_id?: number
  task_id?: number
  x_start_time?: string
  x_end_time?: string
}): Promise<number> {
  const session = getTenantFromSession()
  if (!session) throw new Error('Not authenticated')

  return callOdooViaEdgeFunction(
    session.tenant_slug,
    session.user_email,
    session.password,
    'account.analytic.line',
    'create',
    [entry],
    {}
  )
}

export async function updateTimeEntry(
  id: number,
  values: Record<string, any>
): Promise<boolean> {
  const session = getTenantFromSession()
  if (!session) throw new Error('Not authenticated')

  return callOdooViaEdgeFunction(
    session.tenant_slug,
    session.user_email,
    session.password,
    'account.analytic.line',
    'write',
    [[id], values],
    {}
  )
}

export async function deleteTimeEntry(id: number): Promise<boolean> {
  const session = getTenantFromSession()
  if (!session) throw new Error('Not authenticated')

  return callOdooViaEdgeFunction(
    session.tenant_slug,
    session.user_email,
    session.password,
    'account.analytic.line',
    'unlink',
    [[id]],
    {}
  )
}

export async function getProjects(): Promise<any[]> {
  const session = getTenantFromSession()
  if (!session) throw new Error('Not authenticated')

  return callOdooViaEdgeFunction(
    session.tenant_slug,
    session.user_email,
    session.password,
    'project.project',
    'search_read',
    [[['active', '=', true]]],
    { fields: ['id', 'name'], order: 'name asc' }
  )
}

export async function getTasks(projectId?: number): Promise<any[]> {
  const session = getTenantFromSession()
  if (!session) throw new Error('Not authenticated')

  const domain: any[] = [['active', '=', true]]
  if (projectId) domain.push(['project_id', '=', projectId])

  return callOdooViaEdgeFunction(
    session.tenant_slug,
    session.user_email,
    session.password,
    'project.task',
    'search_read',
    [domain],
    { fields: ['id', 'name', 'project_id'], order: 'name asc' }
  )
}

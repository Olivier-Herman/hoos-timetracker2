import bcryptjs from 'bcryptjs'
import { supabase, AdminUser } from './supabaseClient'
import { logAudit } from './auditService'

export async function registerAdmin(email: string, password: string): Promise<AdminUser> {
  const salt = await bcryptjs.genSalt(10)
  const passwordHash = await bcryptjs.hash(password, salt)

  const { data, error } = await supabase
    .from('admin_users')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single()

  if (error) throw error
  await logAudit(email, 'admin_register', undefined, undefined, { email })
  return data as AdminUser
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !data) {
    await logAudit(email, 'admin_login_failed', undefined, undefined, { reason: 'user_not_found' })
    throw new Error('Email ou mot de passe invalide')
  }

  const passwordMatch = await bcryptjs.compare(password, data.password_hash)
  if (!passwordMatch) {
    await logAudit(email, 'admin_login_failed', undefined, undefined, { reason: 'password_mismatch' })
    throw new Error('Email ou mot de passe invalide')
  }

  await supabase
    .from('admin_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', data.id)

  await logAudit(email, 'admin_login_success', undefined, undefined, {})
  return data as AdminUser
}

export function setAdminSession(email: string): void {
  localStorage.setItem('admin_session', JSON.stringify({
    email,
    logged_in_at: new Date().toISOString(),
  }))
}

export function getAdminSession(): { email: string; logged_in_at: string } | null {
  const session = localStorage.getItem('admin_session')
  if (!session) return null
  try {
    return JSON.parse(session)
  } catch {
    return null
  }
}

export function isAdminAuthenticated(): boolean {
  return getAdminSession() !== null
}

export async function logoutAdmin(): Promise<void> {
  const session = getAdminSession()
  if (session) {
    await logAudit(session.email, 'admin_logout', undefined, undefined, {})
  }
  localStorage.removeItem('admin_session')
}

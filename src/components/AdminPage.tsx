import React, { useState, useEffect } from 'react'
import { Clock, LogOut, Moon, Sun, Plus, Edit2, Trash2, CheckCircle, XCircle, RefreshCw, Settings, Users, FileText, Search, RotateCcw } from 'lucide-react'
import { Button } from './ui/Button'
import { Input, Select, Alert, Modal, Badge, Card, CardHeader, CardTitle, CardContent } from './ui/index'
import { getAdminSession, isAdminAuthenticated, loginAdmin, setAdminSession, logoutAdmin, registerAdmin } from '@/lib/adminAuthService'
import { fetchAllTenants, createTenant, updateTenant, suspendTenant, reactivateTenant, deleteTenant, encryptApiKey, verifyOdooCredentials } from '@/lib/tenantService'
import { fetchAuditLogs } from '@/lib/auditService'
import { fetchClientLogs } from '@/lib/clientLoginLogsService'
import { getGlobalSettings, updateGlobalSettings } from '@/lib/settingsService'
import { logAudit } from '@/lib/auditService'
import { useTheme } from '@/lib/themeContext'
import type { Tenant } from '@/lib/supabaseClient'

type Tab = 'tenants' | 'logs' | 'settings'

function StatusBadge({ tenant }: { tenant: Tenant }) {
  if (tenant.status === 'suspended') return <Badge variant="destructive">Suspendu</Badge>
  if (tenant.is_trial) {
    const expired = tenant.trial_expires_at && new Date(tenant.trial_expires_at) < new Date()
    return <Badge variant={expired ? 'warning' : 'trial'}>{expired ? 'Trial expiré' : 'Trial'}</Badge>
  }
  if (tenant.validity_date && new Date(tenant.validity_date) < new Date()) {
    return <Badge variant="warning">Expiré</Badge>
  }
  return <Badge variant="success">Actif</Badge>
}

// ── Admin Login ───────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const { isDark, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginAdmin(email, password)
      setAdminSession(email)
      onLogin()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
          <p className="text-sm text-muted-foreground">Hoos TimeTracker</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Connexion administrateur</h2>
          {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Mot de passe" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            <Button type="submit" className="w-full" loading={loading}>Se connecter</Button>
          </form>
        </div>
        <div className="flex justify-between items-center mt-4">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground">← Accueil</a>
          <button onClick={toggleTheme} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tenant Form Modal ─────────────────────────────────────────────────────────
interface TenantFormData {
  subdomain: string
  company_name: string
  company_vat_number: string
  odoo_url: string
  odoo_database: string
  api_key_encrypted: string
  admin_email: string
  odoo_user_email: string
  status: string
  plan: string
  is_trial: boolean
  trial_expires_at: string
  validity_date: string
  has_custom_time_fields: boolean
}

function TenantModal({
  open, onClose, tenant, onSaved
}: {
  open: boolean
  onClose: () => void
  tenant: Tenant | null
  onSaved: () => void
}) {
  const session = getAdminSession()
  const [form, setForm] = useState<TenantFormData>({
    subdomain: '', company_name: '', company_vat_number: '',
    odoo_url: '', odoo_database: '', api_key_encrypted: '',
    admin_email: '', odoo_user_email: '', status: 'active',
    plan: 'starter', is_trial: false, trial_expires_at: '',
    validity_date: '', has_custom_time_fields: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (tenant) {
      setForm({
        subdomain: tenant.subdomain,
        company_name: tenant.company_name,
        company_vat_number: tenant.company_vat_number || '',
        odoo_url: tenant.odoo_url,
        odoo_database: tenant.odoo_database,
        api_key_encrypted: '',
        admin_email: tenant.admin_email,
        odoo_user_email: tenant.odoo_user_email || '',
        status: tenant.status,
        plan: tenant.plan || 'starter',
        is_trial: tenant.is_trial || false,
        trial_expires_at: tenant.trial_expires_at ? tenant.trial_expires_at.slice(0, 10) : '',
        validity_date: tenant.validity_date || '',
        has_custom_time_fields: tenant.has_custom_time_fields ?? true,
      })
    } else {
      setForm({ subdomain: '', company_name: '', company_vat_number: '', odoo_url: '', odoo_database: '', api_key_encrypted: '', admin_email: '', odoo_user_email: '', status: 'active', plan: 'starter', is_trial: false, trial_expires_at: '', validity_date: '', has_custom_time_fields: true })
    }
    setError('')
    setVerified(false)
  }, [tenant, open])

  const handleVerify = async () => {
    setVerifying(true)
    setError('')
    try {
      const result = await verifyOdooCredentials(form.odoo_url, form.odoo_database, form.odoo_user_email, form.api_key_encrypted)
      if (result.success) setVerified(true)
      else setError(result.error || 'Vérification échouée')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data: any = {
        subdomain: form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        company_name: form.company_name,
        company_vat_number: form.company_vat_number || null,
        odoo_url: form.odoo_url,
        odoo_database: form.odoo_database,
        admin_email: form.admin_email,
        odoo_user_email: form.odoo_user_email || null,
        status: form.status as any,
        plan: form.plan,
        is_trial: form.is_trial,
        trial_expires_at: form.trial_expires_at ? new Date(form.trial_expires_at).toISOString() : null,
        validity_date: form.validity_date || null,
        has_custom_time_fields: form.has_custom_time_fields,
      }
      if (form.api_key_encrypted) {
        data.api_key_encrypted = encryptApiKey(form.api_key_encrypted)
      } else if (tenant) {
        delete data.api_key_encrypted
      } else {
        setError('La clé API est requise pour un nouveau tenant')
        setSaving(false)
        return
      }

      if (tenant) {
        await updateTenant(tenant.id, data)
        await logAudit(session!.email, 'tenant_updated', tenant.id, tenant.subdomain, { changes: Object.keys(data) })
      } else {
        const created = await createTenant(data)
        await logAudit(session!.email, 'tenant_created', created.id, created.subdomain, {})
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message?.includes('unique') ? 'Ce sous-domaine est déjà utilisé' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const f = (field: keyof TenantFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={tenant ? 'Modifier le tenant' : 'Nouveau tenant'} className="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Sous-domaine / Slug" required value={form.subdomain} onChange={f('subdomain')} placeholder="mon-client" />
          <Input label="Nom entreprise" required value={form.company_name} onChange={f('company_name')} placeholder="Acme SARL" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="N° TVA" value={form.company_vat_number} onChange={f('company_vat_number')} placeholder="BE0123456789" />
          <Input label="Email admin" type="email" required value={form.admin_email} onChange={f('admin_email')} />
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium mb-3">Configuration Odoo</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="URL Odoo" required value={form.odoo_url} onChange={f('odoo_url')} placeholder="https://odoo.exemple.com" />
              <Input label="Base de données" required value={form.odoo_database} onChange={f('odoo_database')} placeholder="nom_db" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Email utilisateur Odoo" type="email" value={form.odoo_user_email} onChange={f('odoo_user_email')} />
              <div className="space-y-1">
                <Input label={tenant ? 'Nouvelle clé API (laisser vide pour conserver)' : 'Clé API Odoo'} type="password" value={form.api_key_encrypted} onChange={f('api_key_encrypted')} placeholder="••••••••" />
                {form.api_key_encrypted && form.odoo_url && form.odoo_database && form.odoo_user_email && (
                  <Button type="button" size="sm" variant="outline" onClick={handleVerify} loading={verifying}>
                    {verified ? '✓ Vérifiée' : 'Vérifier'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium mb-3">Plan & Statut</p>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Statut" value={form.status} onChange={f('status')}>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
            </Select>
            <Select label="Plan" value={form.plan} onChange={f('plan')}>
              <option value="trial">Trial</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </Select>
            <Input label="Date validité" type="date" value={form.validity_date} onChange={f('validity_date')} />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_trial} onChange={f('is_trial')} className="rounded" />
              Mode trial
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.has_custom_time_fields} onChange={f('has_custom_time_fields')} className="rounded" />
              Champs horaires personnalisés
            </label>
          </div>
          {form.is_trial && (
            <div className="mt-2">
              <Input label="Expiration trial" type="date" value={form.trial_expires_at} onChange={f('trial_expires_at')} />
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button type="submit" className="flex-1" loading={saving}>{tenant ? 'Mettre à jour' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main AdminPage ─────────────────────────────────────────────────────────────
export function AdminPage() {
  const { isDark, toggleTheme } = useTheme()
  const [authenticated, setAuthenticated] = useState(isAdminAuthenticated())
  const [tab, setTab] = useState<Tab>('tenants')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [clientLogs, setClientLogs] = useState<any[]>([])
  const [globalSettings, setGlobalSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  // Tenant modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)

  // Settings form
  const [maintenanceBanner, setMaintenanceBanner] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const session = getAdminSession()

  const loadTenants = async () => {
    setLoading(true)
    try {
      const data = await fetchAllTenants()
      setTenants(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const [audit, client] = await Promise.all([fetchAuditLogs(200), fetchClientLogs(undefined, 200)])
      setAuditLogs(audit)
      setClientLogs(client)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const s = await getGlobalSettings()
      if (s) {
        setGlobalSettings(s)
        setMaintenanceBanner(s.show_maintenance_banner)
        setMaintenanceMsg(s.maintenance_message)
      }
    } catch {}
  }

  useEffect(() => {
    if (!authenticated) return
    if (tab === 'tenants') loadTenants()
    else if (tab === 'logs') loadLogs()
    else if (tab === 'settings') loadSettings()
  }, [authenticated, tab])

  const handleLogout = async () => {
    await logoutAdmin()
    setAuthenticated(false)
  }

  const handleSuspend = async (tenant: Tenant) => {
    if (!window.confirm(`Suspendre "${tenant.company_name}" ?`)) return
    try {
      await suspendTenant(tenant.id)
      await logAudit(session!.email, 'tenant_suspended', tenant.id, tenant.subdomain, {})
      await loadTenants()
    } catch (err: any) { setError(err.message) }
  }

  const handleReactivate = async (tenant: Tenant) => {
    try {
      await reactivateTenant(tenant.id)
      await logAudit(session!.email, 'tenant_reactivated', tenant.id, tenant.subdomain, {})
      await loadTenants()
    } catch (err: any) { setError(err.message) }
  }

  const handleDelete = async (tenant: Tenant) => {
    if (!window.confirm(`Supprimer définitivement "${tenant.company_name}" ?`)) return
    try {
      await deleteTenant(tenant.id)
      await logAudit(session!.email, 'tenant_deleted', tenant.id, tenant.subdomain, {})
      await loadTenants()
    } catch (err: any) { setError(err.message) }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await updateGlobalSettings({ show_maintenance_banner: maintenanceBanner, maintenance_message: maintenanceMsg })
      await logAudit(session!.email, 'settings_updated', undefined, undefined, {})
    } catch (err: any) { setError(err.message) }
    finally { setSavingSettings(false) }
  }

  if (!authenticated) return <AdminLogin onLogin={() => setAuthenticated(true)} />

  const filteredTenants = tenants.filter(t =>
    t.company_name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase()) ||
    t.admin_email.toLowerCase().includes(search.toLowerCase())
  )

  const activeTenants = tenants.filter(t => t.status === 'active').length
  const suspendedTenants = tenants.filter(t => t.status === 'suspended').length
  const trialTenants = tenants.filter(t => t.is_trial).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-semibold">Admin Panel</span>
            <span className="text-xs text-muted-foreground hidden sm:block">— {session?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded hover:bg-accent text-muted-foreground">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Button size="sm" variant="ghost" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
              <LogOut className="w-4 h-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {tab === 'tenants' && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Tenants actifs', value: activeTenants, color: 'text-green-600' },
              { label: 'En trial', value: trialTenants, color: 'text-purple-600' },
              { label: 'Suspendus', value: suspendedTenants, color: 'text-red-600' },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          {([['tenants', 'Tenants', Users], ['logs', 'Logs', FileText], ['settings', 'Paramètres', Settings]] as const).map(([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

        {/* Tenants Tab */}
        {tab === 'tenants' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button onClick={loadTenants} className="p-2 rounded-md hover:bg-accent text-muted-foreground" title="Actualiser">
                <RotateCcw className="w-4 h-4" />
              </button>
              <Button size="sm" onClick={() => { setEditingTenant(null); setModalOpen(true) }} className="gap-1.5">
                <Plus className="w-4 h-4" /> Nouveau tenant
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Entreprise</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Slug</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Plan</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Créé</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTenants.map(tenant => (
                      <tr key={tenant.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-medium">{tenant.company_name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.admin_email}</p>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <a href={`/${tenant.subdomain}`} target="_blank" className="font-mono text-xs text-primary hover:underline">
                            /{tenant.subdomain}
                          </a>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className="capitalize text-xs">{tenant.plan || 'starter'}</span>
                        </td>
                        <td className="p-3"><StatusBadge tenant={tenant} /></td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {new Date(tenant.created_at).toLocaleDateString('fr-BE')}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => { setEditingTenant(tenant); setModalOpen(true) }} className="p-1.5 rounded hover:bg-accent text-muted-foreground" title="Modifier">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {tenant.status === 'active' ? (
                              <button onClick={() => handleSuspend(tenant)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Suspendre">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => handleReactivate(tenant)} className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600" title="Réactiver">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(tenant)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTenants.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucun tenant trouvé</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Logs Tab */}
        {tab === 'logs' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Logs admin</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Admin</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tenant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString('fr-BE')}</td>
                        <td className="p-3">{log.admin_email}</td>
                        <td className="p-3"><Badge variant="outline">{log.action}</Badge></td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{log.tenant_subdomain || '—'}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun log</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Logs clients</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Tenant</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Utilisateur</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clientLogs.map(log => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString('fr-BE')}</td>
                        <td className="p-3 font-mono">{log.tenant_subdomain}</td>
                        <td className="p-3">{log.user_email}</td>
                        <td className="p-3"><Badge variant="outline">{log.action_type || log.action}</Badge></td>
                      </tr>
                    ))}
                    {clientLogs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun log</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="max-w-lg">
            <Card>
              <CardHeader><CardTitle>Bannière de maintenance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={maintenanceBanner} onChange={e => setMaintenanceBanner(e.target.checked)} className="rounded" />
                  Afficher la bannière de maintenance
                </label>
                {maintenanceBanner && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea
                      value={maintenanceMsg}
                      onChange={e => setMaintenanceMsg(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="Message affiché aux utilisateurs..."
                    />
                  </div>
                )}
                <Button onClick={handleSaveSettings} loading={savingSettings}>Sauvegarder</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <TenantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tenant={editingTenant}
        onSaved={loadTenants}
      />
    </div>
  )
}

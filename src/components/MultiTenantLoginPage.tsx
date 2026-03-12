import React, { useState, useEffect } from 'react'
import { Clock, Loader, Moon, Sun } from 'lucide-react'
import { Button } from './ui/Button'
import { Input, Alert } from './ui/index'
import { SuspendedAccessPage } from './NotFoundPage'
import { getTenantSlug, getTenantBySlug, setTenantSession } from '@/lib/multiTenantUtils'
import { isTenantValid } from '@/lib/tenantService'
import { authenticateUserMultiTenant } from '@/lib/multiTenantOdooAPI'
import { useTheme } from '@/lib/themeContext'

interface Props {
  onLoginSuccess: () => void
}

export function MultiTenantLoginPage({ onLoginSuccess }: Props) {
  const { isDark, toggleTheme } = useTheme()
  const [slug, setSlug] = useState('')
  const [tenantData, setTenantData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadTenant = async () => {
      try {
        const tenantSlug = getTenantSlug()
        setSlug(tenantSlug)
        if (!tenantSlug || tenantSlug === 'admin') { setLoading(false); return }

        const tenant = await getTenantBySlug(tenantSlug)
        if (!tenant) { setError('Tenant not found'); setLoading(false); return }

        const isValid = isTenantValid(tenant)
        if (!isValid) {
          setTenantData({ ...tenant, isSuspended: true })
          setLoading(false)
          return
        }
        setTenantData(tenant)
      } catch (err) {
        setError('Erreur lors du chargement de la configuration')
      } finally {
        setLoading(false)
      }
    }
    loadTenant()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (tenantData?.isSuspended) return <SuspendedAccessPage slug={slug} />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (!tenantData) { setError('Configuration introuvable'); return }
      const authResult = await authenticateUserMultiTenant(email, password, slug)
      setTenantSession(
        authResult.tenant_id,
        authResult.tenant_slug,
        authResult.odoo_url,
        authResult.odoo_database,
        email,
        password,
        authResult.uid,
        undefined,
        authResult.has_custom_time_fields
      )
      onLoginSuccess()
    } catch (err: any) {
      setError(err.message || 'Authentification échouée')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">Hoos TimeTracker</span>
          </div>
          {tenantData && (
            <p className="text-sm text-muted-foreground mt-1">
              {tenantData.company_name}
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-1">Connexion</h2>
          <p className="text-sm text-muted-foreground mb-5">Utilisez vos identifiants Odoo</p>

          {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" loading={submitting}>
              Se connecter
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-between mt-6">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </a>
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

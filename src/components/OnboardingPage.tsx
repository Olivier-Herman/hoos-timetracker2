import React, { useState } from 'react'
import { Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/index'
import { Alert } from './ui/index'
import { createTenant, encryptApiKey, verifyOdooCredentials } from '@/lib/tenantService'
import { logAudit } from '@/lib/auditService'

type Step = 'odoo' | 'company' | 'done'

export function OnboardingPage() {
  const [step, setStep] = useState<Step>('odoo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 - Odoo
  const [odooUrl, setOdooUrl] = useState('')
  const [odooDatabase, setOdooDatabase] = useState('')
  const [odooEmail, setOdooEmail] = useState('')
  const [odooApiKey, setOdooApiKey] = useState('')
  const [odooVerified, setOdooVerified] = useState(false)

  // Step 2 - Company
  const [companyName, setCompanyName] = useState('')
  const [companyVat, setCompanyVat] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  // Done
  const [tenantSlug, setTenantSlug] = useState('')

  const handleVerifyOdoo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await verifyOdooCredentials(odooUrl, odooDatabase, odooEmail, odooApiKey)
      if (!result.success) {
        setError(result.error || 'Vérification Odoo échouée')
      } else {
        setOdooVerified(true)
        setStep('company')
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate subdomain
    const slug = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (!slug) {
      setError('Sous-domaine invalide')
      setLoading(false)
      return
    }

    try {
      const trialExpires = new Date()
      trialExpires.setDate(trialExpires.getDate() + 14)

      const tenant = await createTenant({
        subdomain: slug,
        company_name: companyName,
        company_vat_number: companyVat || undefined,
        odoo_url: odooUrl,
        odoo_database: odooDatabase,
        api_key_encrypted: encryptApiKey(odooApiKey),
        admin_email: adminEmail || odooEmail,
        odoo_user_email: odooEmail,
        status: 'active',
        plan: 'trial',
        is_trial: true,
        trial_expires_at: trialExpires.toISOString(),
        has_custom_time_fields: true,
      })

      await logAudit('system', 'tenant_onboarding', tenant.id, slug, { company: companyName })
      setTenantSlug(slug)
      setStep('done')
    } catch (err: any) {
      setError(err.message?.includes('unique') ? 'Ce sous-domaine est déjà pris. Choisissez-en un autre.' : err.message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6">
            <Clock className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">Hoos TimeTracker</span>
          </a>
          <h1 className="text-2xl font-bold">Démarrer votre essai gratuit</h1>
          <p className="text-muted-foreground mt-1 text-sm">14 jours gratuits, sans carte de crédit</p>
        </div>

        {/* Progress */}
        {step !== 'done' && (
          <div className="flex items-center gap-2 mb-8">
            {(['odoo', 'company'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 text-sm ${step === s ? 'text-primary font-medium' : step === 'company' && s === 'odoo' ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-primary text-primary-foreground' : step === 'company' && s === 'odoo' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {step === 'company' && s === 'odoo' ? '✓' : i + 1}
                  </div>
                  {s === 'odoo' ? 'Connexion Odoo' : 'Votre entreprise'}
                </div>
                {i === 0 && <div className={`flex-1 h-px ${step === 'company' ? 'bg-green-500' : 'bg-border'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step 1 - Odoo */}
        {step === 'odoo' && (
          <form onSubmit={handleVerifyOdoo} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Paramètres Odoo</h2>
            <p className="text-sm text-muted-foreground">Entrez les informations de connexion à votre instance Odoo.</p>
            {error && <Alert variant="destructive">{error}</Alert>}
            <Input
              label="URL Odoo"
              type="url"
              required
              value={odooUrl}
              onChange={e => setOdooUrl(e.target.value)}
              placeholder="https://mon-odoo.exemple.com"
            />
            <Input
              label="Base de données"
              required
              value={odooDatabase}
              onChange={e => setOdooDatabase(e.target.value)}
              placeholder="nom_base_de_données"
            />
            <Input
              label="Email de connexion Odoo"
              type="email"
              required
              value={odooEmail}
              onChange={e => setOdooEmail(e.target.value)}
              placeholder="admin@exemple.com"
            />
            <Input
              label="Clé API Odoo"
              type="password"
              required
              value={odooApiKey}
              onChange={e => setOdooApiKey(e.target.value)}
              placeholder="Votre clé API Odoo"
            />
            <Button type="submit" className="w-full" loading={loading}>
              Vérifier la connexion Odoo
            </Button>
          </form>
        )}

        {/* Step 2 - Company */}
        {step === 'company' && (
          <form onSubmit={handleCreateTenant} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Votre entreprise</h2>
            {error && <Alert variant="destructive">{error}</Alert>}
            <Input
              label="Nom de l'entreprise"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Acme SARL"
            />
            <Input
              label="Numéro de TVA (optionnel)"
              value={companyVat}
              onChange={e => setCompanyVat(e.target.value)}
              placeholder="BE0123456789"
            />
            <div>
              <Input
                label="Identifiant unique (URL)"
                required
                value={subdomain}
                onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="mon-entreprise"
              />
              {subdomain && (
                <p className="text-xs text-muted-foreground mt-1">
                  Accès : <span className="font-mono text-primary">pointages.hoos.cloud/{subdomain}</span>
                </p>
              )}
            </div>
            <Input
              label="Email administrateur"
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder={odooEmail}
            />
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('odoo')}>
                Retour
              </Button>
              <Button type="submit" className="flex-1" loading={loading}>
                Créer mon espace
              </Button>
            </div>
          </form>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold">Votre espace est prêt !</h2>
            <p className="text-muted-foreground text-sm">
              Votre essai gratuit de 14 jours a démarré. Connectez-vous dès maintenant avec vos identifiants Odoo.
            </p>
            <div className="bg-muted rounded-lg p-3 text-sm font-mono">
              pointages.hoos.cloud/{tenantSlug}
            </div>
            <a href={`/${tenantSlug}`}>
              <Button className="w-full">Accéder à mon espace</Button>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

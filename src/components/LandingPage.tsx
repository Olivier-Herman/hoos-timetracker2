import React, { useState } from 'react'
import { useTheme } from '@/lib/themeContext'
import { Button } from './ui/Button'
import { Moon, Sun, Clock, Shield, Zap, Check, Mail, Phone, ArrowRight } from 'lucide-react'

export function LandingPage() {
  const { isDark, toggleTheme } = useTheme()
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault()
    // Formspree or similar
    setContactSent(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">Hoos TimeTracker</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Tarifs</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
            <a href="/onboarding">
              <Button size="sm">Essai gratuit</Button>
            </a>
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-accent">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm mb-6">
          <Zap className="w-3.5 h-3.5" />
          Connecté à Odoo en temps réel
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Le suivi de temps<br />
          <span className="text-primary">simple pour vos équipes</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Hoos TimeTracker synchronise automatiquement les heures de travail de vos collaborateurs
          directement dans Odoo. Zéro friction, zéro doublon.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/onboarding">
            <Button size="lg" className="gap-2">
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
          <a href="#pricing">
            <Button size="lg" variant="outline">Voir les tarifs</Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/40 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Pourquoi Hoos TimeTracker ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Clock className="w-6 h-6 text-primary" />,
                title: 'Saisie rapide',
                desc: 'Interface épurée pour encoder ses heures en quelques secondes, avec ou sans minuterie intégrée.',
              },
              {
                icon: <Zap className="w-6 h-6 text-primary" />,
                title: 'Sync Odoo instantanée',
                desc: 'Chaque entrée est immédiatement synchronisée dans votre base Odoo via JSON-RPC sécurisé.',
              },
              {
                icon: <Shield className="w-6 h-6 text-primary" />,
                title: 'Multi-tenant sécurisé',
                desc: 'Chaque client dispose de son propre espace isolé avec authentification Odoo native.',
              },
            ].map((f, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Tarification simple</h2>
        <p className="text-muted-foreground text-center mb-12">Commencez gratuitement, passez au plan payant quand vous êtes prêt.</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              name: 'Trial',
              price: 'Gratuit',
              period: '14 jours',
              features: ['1 tenant', "Jusqu'à 5 utilisateurs", 'Sync Odoo complète', 'Support email'],
              cta: 'Essayer',
              href: '/onboarding',
              highlighted: false,
            },
            {
              name: 'Starter',
              price: '29€',
              period: '/mois',
              features: ['1 tenant', 'Utilisateurs illimités', 'Sync Odoo complète', 'Support prioritaire', 'Export PDF'],
              cta: 'Choisir Starter',
              href: '/onboarding',
              highlighted: true,
            },
            {
              name: 'Pro',
              price: '79€',
              period: '/mois',
              features: ['Multi-tenants', 'Utilisateurs illimités', 'API access', 'Support dédié', 'SLA garanti'],
              cta: 'Nous contacter',
              href: '#contact',
              highlighted: false,
            },
          ].map((plan, i) => (
            <div key={i} className={`rounded-xl border p-6 flex flex-col ${plan.highlighted ? 'border-primary ring-2 ring-primary/20 relative' : 'border-border'}`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                  Populaire
                </div>
              )}
              <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href={plan.href}>
                <Button variant={plan.highlighted ? 'default' : 'outline'} className="w-full">
                  {plan.cta}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-muted/40 py-20">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Contactez-nous</h2>
          <p className="text-muted-foreground text-center mb-10">Une question ? Nous répondons sous 24h.</p>
          {contactSent ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-800 dark:text-green-300">Message envoyé !</p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">Nous vous répondrons rapidement.</p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="space-y-4 bg-card rounded-xl border border-border p-8">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="vous@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Votre message..."
                />
              </div>
              <Button type="submit" className="w-full">Envoyer</Button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Hoos TimeTracker © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground">Mentions légales</a>
            <a href="#" className="hover:text-foreground">Confidentialité</a>
            <a href="/admin" className="hover:text-foreground">Admin</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

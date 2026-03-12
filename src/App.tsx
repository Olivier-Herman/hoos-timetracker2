import React, { useState, useEffect } from 'react'
import { MultiTenantLoginPage } from './components/MultiTenantLoginPage'
import { AdminPage } from './components/AdminPage'
import { ClientApp } from './components/ClientApp'
import { NotFoundPage } from './components/NotFoundPage'
import { LandingPage } from './components/LandingPage'
import { OnboardingPage } from './components/OnboardingPage'
import { initializeSettings } from './lib/settingsService'
import { ThemeContext } from './lib/themeContext'
import { isAdminRoute, isOnboardingRoute, getTenantSlug, getTenantBySlug, getTenantFromSession } from './lib/multiTenantUtils'

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [isClientLoggedIn, setIsClientLoggedIn] = useState(() => !!getTenantFromSession())
  const [tenantExists, setTenantExists] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeSettings()
  }, [])

  useEffect(() => {
    const checkTenant = async () => {
      if (!isAdminRoute() && !isOnboardingRoute()) {
        const slug = getTenantSlug()
        if (slug) {
          const tenant = await getTenantBySlug(slug)
          const existingSession = getTenantFromSession()
          setTenantExists(!!tenant || !!existingSession)
          if (existingSession && existingSession.tenant_slug === slug) {
            setIsClientLoggedIn(true)
          }
        }
      }
      setLoading(false)
    }
    checkTenant()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(d => !d)
  const slug = getTenantSlug()
  const pathname = window.location.pathname

  if (loading) {
    return (
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Chargement...</p>
        </div>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {isAdminRoute() ? (
        <AdminPage />
      ) : isOnboardingRoute() ? (
        <OnboardingPage />
      ) : !slug ? (
        <LandingPage />
      ) : !tenantExists ? (
        <NotFoundPage slug={slug} />
      ) : isClientLoggedIn && getTenantFromSession() ? (
        <ClientApp onLogout={() => {
          setIsClientLoggedIn(false)
          // Redirect to login page of current slug
          window.history.pushState({}, '', `/${slug}`)
        }} />
      ) : (
        <MultiTenantLoginPage onLoginSuccess={() => setIsClientLoggedIn(true)} />
      )}
    </ThemeContext.Provider>
  )
}

export default App

# Hoos TimeTracker

SaaS multi-tenant de suivi de temps connecté à Odoo, déployé sur Vercel + Supabase.

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions Deno)
- **Déploiement**: Vercel
- **Intégration**: Odoo JSON-RPC via Edge Functions

## Architecture URL

```
https://pointages.hoos.cloud/           → LandingPage
https://pointages.hoos.cloud/onboarding → OnboardingPage (signup trial)
https://pointages.hoos.cloud/{slug}     → Login client Odoo
https://pointages.hoos.cloud/{slug}/app → Dashboard suivi temps
https://pointages.hoos.cloud/admin      → Panel admin
```

## Setup

### 1. Supabase

**Option A — Même projet Supabase existant**
Rien à faire, les tables existent déjà.

**Option B — Nouveau projet Supabase**
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans SQL Editor et coller le contenu de `supabase/schema.sql`
3. Déployer les Edge Functions (voir ci-dessous)

### 2. Edge Functions Supabase

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Lier au projet
supabase link --project-ref VOTRE_PROJECT_ID

# Déployer les fonctions
supabase functions deploy authenticate-odoo
supabase functions deploy call-odoo
supabase functions deploy verify-odoo-credentials

# Configurer les secrets
supabase secrets set SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

### 3. Variables d'environnement locales

```bash
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

### 4. Installation & dev local

```bash
npm install
npm run dev
```

### 5. Déploiement Vercel

1. Importer le repo sur [vercel.com](https://vercel.com)
2. Ajouter les variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Le fichier `vercel.json` gère le routing SPA automatiquement

## Créer le premier compte admin

Aller sur `/admin` → le formulaire de login apparaît.
Utiliser la fonction `registerAdmin` depuis la console ou créer manuellement dans Supabase :

```sql
-- Exemple avec bcrypt hash pour le mot de passe "admin123"
INSERT INTO admin_users (email, password_hash)
VALUES ('admin@hoos.cloud', '$2a$10$...');
```

Ou temporairement désactiver RLS sur `admin_users`, créer via l'interface Supabase, puis réactiver.

## Structure du projet

```
src/
├── App.tsx                    # Routing principal (path-based)
├── components/
│   ├── LandingPage.tsx        # Page marketing
│   ├── OnboardingPage.tsx     # Signup trial
│   ├── MultiTenantLoginPage.tsx # Login Odoo par tenant
│   ├── ClientApp.tsx          # Dashboard suivi temps
│   ├── AdminPage.tsx          # Panel admin complet
│   ├── NotFoundPage.tsx       # 404 + Suspendu
│   └── ui/                    # Composants UI réutilisables
├── lib/
│   ├── supabaseClient.ts      # Client Supabase + interfaces
│   ├── multiTenantUtils.ts    # Routing path-based, sessions
│   ├── multiTenantOdooAPI.ts  # Appels Odoo via Edge Functions
│   ├── tenantService.ts       # CRUD tenants
│   ├── adminAuthService.ts    # Auth admin bcrypt
│   ├── auditService.ts        # Logs audit
│   ├── clientLoginLogsService.ts # Logs clients
│   ├── settingsService.ts     # Paramètres globaux
│   └── timeEntriesService.ts  # CRUD time entries Supabase
supabase/
├── schema.sql                 # Migration SQL complète
└── functions/
    ├── authenticate-odoo/     # Auth Odoo → retourne uid
    ├── call-odoo/             # Appels Odoo génériques
    └── verify-odoo-credentials/ # Vérification lors onboarding
```

## Différence vs projet HelloLeo original

| Aspect | HelloLeo | Ce projet |
|--------|----------|-----------|
| Routing tenant | Subdomain (`slug.domain.com`) | Path (`domain.com/slug`) |
| Env vars | Hardcodées | Variables d'environnement |
| Supabase URL | HelloLeo proxy | Direct Supabase |

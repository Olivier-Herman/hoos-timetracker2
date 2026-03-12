-- ============================================================
-- Hoos TimeTracker — Schema SQL
-- Coller dans Supabase SQL Editor pour un nouveau projet
-- ============================================================

-- admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subdomain text NOT NULL UNIQUE,
  company_name text NOT NULL,
  company_vat_number varchar,
  odoo_url text NOT NULL,
  odoo_database text NOT NULL,
  api_key_encrypted text NOT NULL,
  admin_email text NOT NULL,
  odoo_user_email text,
  status text NOT NULL DEFAULT 'active',
  plan text DEFAULT 'starter',
  is_trial boolean DEFAULT false,
  trial_expires_at timestamptz,
  validity_date date,
  has_custom_time_fields boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  suspended_at timestamptz,
  deleted_at timestamptz
);

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email text NOT NULL,
  action text NOT NULL,
  tenant_id uuid,
  tenant_subdomain text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- client_login_logs
CREATE TABLE IF NOT EXISTS public.client_login_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  tenant_subdomain text NOT NULL,
  user_email text NOT NULL,
  action text NOT NULL,
  action_type text,
  login_time timestamptz DEFAULT now(),
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- global_settings
CREATE TABLE IF NOT EXISTS public.global_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_maintenance_banner boolean DEFAULT false,
  maintenance_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default global settings row
INSERT INTO public.global_settings (show_maintenance_banner, maintenance_message)
VALUES (false, '')
ON CONFLICT DO NOTHING;

-- tenant_settings
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  show_message_banner boolean DEFAULT false,
  message_banner text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- password_reset_tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- time_entries
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  odoo_entry_id integer,
  start_time timestamptz,
  end_time timestamptz,
  hours numeric,
  entry_date date,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS Policies (anon key access for frontend)
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anon to read tenants (needed for login page lookup)
CREATE POLICY "anon_read_tenants" ON public.tenants
  FOR SELECT TO anon USING (status != 'deleted');

-- Allow anon to insert/update/read all tables (frontend uses anon key)
-- In production you may want more restrictive policies
CREATE POLICY "anon_all_admin_users" ON public.admin_users
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_audit_logs" ON public.audit_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_client_logs" ON public.client_login_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_global_settings" ON public.global_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_tenant_settings" ON public.tenant_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_time_entries" ON public.time_entries
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_insert_tenants" ON public.tenants
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_tenants" ON public.tenants
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_password_tokens" ON public.password_reset_tokens
  FOR ALL TO anon USING (true) WITH CHECK (true);

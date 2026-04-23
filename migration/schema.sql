-- ============================================================================
-- SEDGE Pro — Consolidated Database Schema
-- Generated from supabase/migrations/* on 2026-04-23T06:59:00Z
-- Run on a fresh Postgres / Supabase project to recreate the full schema.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------------
-- Migration: 20260221032702_63874c10-5daf-427b-bfcb-dcfaede78571.sql
-- ---------------------------------------------------------------------------

-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Payments table to track Yoco transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id TEXT,
  payment_id TEXT,
  package_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'created',
  customer_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- RLS: Profiles - admins can see all
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- RLS: User roles - admins can view
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: Payments - admins can view all
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update payments"
  ON public.payments FOR UPDATE
  USING (true);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------------
-- Migration: 20260221032725_4fb6b5cb-2318-46ca-858b-a6b67255218e.sql
-- ---------------------------------------------------------------------------

-- Drop overly permissive policies and replace with role-checked ones
DROP POLICY "Service role can insert profiles" ON public.profiles;
DROP POLICY "Service role can insert payments" ON public.payments;
DROP POLICY "Service role can update payments" ON public.payments;

-- Profiles: allow insert for authenticated users on their own profile (trigger handles this)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Payments: only admins can insert/update via client; edge functions use service_role which bypasses RLS
CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ---------------------------------------------------------------------------
-- Migration: 20260221033725_5f2fa2da-7642-44be-8a49-1a66ca134dab.sql
-- ---------------------------------------------------------------------------

-- Pipeline stages table
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- All authenticated admins can view stages
CREATE POLICY "Admins can view stages"
  ON public.pipeline_stages FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only super_admins can manage stages
CREATE POLICY "Super admins can insert stages"
  ON public.pipeline_stages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update stages"
  ON public.pipeline_stages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete stages"
  ON public.pipeline_stages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- All admins can CRUD leads
CREATE POLICY "Admins can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default stages
INSERT INTO public.pipeline_stages (name, color, position) VALUES
  ('New Lead', '#3B82F6', 0),
  ('Contacted', '#F59E0B', 1),
  ('Qualified', '#8B5CF6', 2),
  ('Proposal', '#EC4899', 3),
  ('Won', '#10B981', 4),
  ('Lost', '#EF4444', 5);


-- ---------------------------------------------------------------------------
-- Migration: 20260221035043_04422728-a672-4fdc-9c9e-aff76926a46e.sql
-- ---------------------------------------------------------------------------

-- Add assigned_to column to leads
ALTER TABLE public.leads ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Create lead_comments table
CREATE TABLE public.lead_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lead comments"
  ON public.lead_comments FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert lead comments"
  ON public.lead_comments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete own comments"
  ON public.lead_comments FOR DELETE
  USING (author_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Migration: 20260221035405_391c3dbd-2e80-4599-9ded-1ed679468d66.sql
-- ---------------------------------------------------------------------------

-- Enable realtime for leads and lead_comments tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_comments;


-- ---------------------------------------------------------------------------
-- Migration: 20260221040637_9fb82289-4ac9-412d-8310-065deb43e646.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ADD COLUMN package text DEFAULT NULL;

-- ---------------------------------------------------------------------------
-- Migration: 20260221044531_5991018d-6f40-407c-b446-0d26238a2bf4.sql
-- ---------------------------------------------------------------------------

-- App settings table (single row for global config)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  require_2fa boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- All admins can read settings
CREATE POLICY "Admins can view settings"
  ON public.app_settings FOR SELECT
  USING (is_admin(auth.uid()));

-- Only super admins can update settings
CREATE POLICY "Super admins can update settings"
  ON public.app_settings FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

-- Insert initial row
INSERT INTO public.app_settings (require_2fa) VALUES (false);


-- ---------------------------------------------------------------------------
-- Migration: 20260221045043_ee3ac2d1-7f69-4ab0-882e-6405cd8d3153.sql
-- ---------------------------------------------------------------------------

-- Add per-user 2FA requirement flag to profiles
ALTER TABLE public.profiles ADD COLUMN require_2fa boolean NOT NULL DEFAULT false;


-- ---------------------------------------------------------------------------
-- Migration: 20260224234554_cca10cc4-f8e9-4315-bba9-6779c5d1a5b1.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ADD COLUMN generated_by text DEFAULT null;

-- ---------------------------------------------------------------------------
-- Migration: 20260225001444_84252edb-d09e-48a4-b032-11ed6829388c.sql
-- ---------------------------------------------------------------------------

-- Table: criteria items per stage
CREATE TABLE public.stage_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stage criteria" ON public.stage_criteria
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can manage stage criteria" ON public.stage_criteria
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Table: per-lead checklist progress
CREATE TABLE public.lead_criteria_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.stage_criteria(id) ON DELETE CASCADE,
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_by UUID,
  checked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(lead_id, criteria_id)
);

ALTER TABLE public.lead_criteria_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lead criteria checks" ON public.lead_criteria_checks
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert lead criteria checks" ON public.lead_criteria_checks
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update lead criteria checks" ON public.lead_criteria_checks
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete lead criteria checks" ON public.lead_criteria_checks
  FOR DELETE USING (is_admin(auth.uid()));


-- ---------------------------------------------------------------------------
-- Migration: 20260225002133_89a65774-a708-4492-ae50-e770277a4b3d.sql
-- ---------------------------------------------------------------------------

-- Create junction table for lead assignments (many-to-many)
CREATE TABLE public.lead_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, user_id)
);

ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lead assignments" ON public.lead_assignments
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert lead assignments" ON public.lead_assignments
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete lead assignments" ON public.lead_assignments
  FOR DELETE USING (is_admin(auth.uid()));


-- ---------------------------------------------------------------------------
-- Migration: 20260225005350_c566281c-250d-4458-83c6-d7e31e00d199.sql
-- ---------------------------------------------------------------------------

-- Salespersons table: admins or external people
CREATE TABLE public.salespersons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  user_id uuid, -- nullable: linked to auth user if admin
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salespersons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view salespersons" ON public.salespersons FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert salespersons" ON public.salespersons FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update salespersons" ON public.salespersons FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete salespersons" ON public.salespersons FOR DELETE USING (is_admin(auth.uid()));

-- Add salesperson_id to leads
ALTER TABLE public.leads ADD COLUMN salesperson_id uuid REFERENCES public.salespersons(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- Migration: 20260225010250_8d252281-d3c1-485b-97ce-ade7d6b28a55.sql
-- ---------------------------------------------------------------------------

-- Packages table for dynamic package management
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  description text,
  features text[] NOT NULL DEFAULT '{}',
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Anyone can view active packages (public pricing page)
CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING (is_active = true);
-- Admins can view all packages including inactive
CREATE POLICY "Admins can view all packages" ON public.packages FOR SELECT USING (is_admin(auth.uid()));
-- Admins can manage packages
CREATE POLICY "Admins can insert packages" ON public.packages FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update packages" ON public.packages FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete packages" ON public.packages FOR DELETE USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing packages
INSERT INTO public.packages (name, price_cents, features, is_popular, position) VALUES
  ('Certificates & Invoicing', 299700, ARRAY['Professional certificate generation', 'Automated invoicing', 'Digital document management', 'Client portal access'], false, 0),
  ('Profitability Management', 999700, ARRAY['Full financial analytics', 'Profit & loss tracking', 'Budget forecasting', 'Custom reporting dashboards', 'Priority support'], true, 1),
  ('Project Collaboration Service', 199700, ARRAY['Team collaboration tools', 'Project tracking', 'Task management', 'Communication hub'], false, 2);


-- ---------------------------------------------------------------------------
-- Migration: 20260225013044_446be5db-5ef0-460e-83c3-0b9ca78ab8ba.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments ADD COLUMN client_name text;

-- ---------------------------------------------------------------------------
-- Migration: 20260225013703_11db649e-6667-4122-8659-1ff890eb7ba6.sql
-- ---------------------------------------------------------------------------
-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Admins can upload payment proofs
CREATE POLICY "Admins can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

-- Admins can view payment proofs
CREATE POLICY "Admins can view payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

-- Admins can delete payment proofs
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

-- Add proof_url column to payments
ALTER TABLE public.payments ADD COLUMN proof_url text;

-- ---------------------------------------------------------------------------
-- Migration: 20260302013451_e34df950-33c5-433d-ab91-9f66bb77111e.sql
-- ---------------------------------------------------------------------------

CREATE TABLE public.revenue_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_year INTEGER NOT NULL,
  period_month INTEGER, -- 1-12 for monthly, NULL for yearly
  period_quarter INTEGER, -- 1-4 for quarterly, NULL for monthly/yearly
  target_amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(period_type, period_year, period_month, period_quarter)
);

ALTER TABLE public.revenue_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view revenue targets" ON public.revenue_targets FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert revenue targets" ON public.revenue_targets FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update revenue targets" ON public.revenue_targets FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete revenue targets" ON public.revenue_targets FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_revenue_targets_updated_at
BEFORE UPDATE ON public.revenue_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------------
-- Migration: 20260303080547_c49d0a06-1d3f-4f0f-9c34-d16bff50de67.sql
-- ---------------------------------------------------------------------------

-- Create clients table (linked to leads via name/email matching)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view clients" ON public.clients FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert clients" ON public.clients FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create business_profiles table
CREATE TABLE public.business_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT,
  business_logo TEXT,
  contact_phone TEXT,
  physical_address TEXT,
  website_address TEXT,
  bank_name TEXT,
  account_holder_name TEXT,
  account_number TEXT,
  branch_code TEXT,
  terms_and_conditions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view business profiles" ON public.business_profiles FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert business profiles" ON public.business_profiles FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update business profiles" ON public.business_profiles FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete business profiles" ON public.business_profiles FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  dimensions TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  photos TEXT[],
  category TEXT,
  sku TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view products" ON public.products FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invoices" ON public.invoices FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert invoices" ON public.invoices FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update invoices" ON public.invoices FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create invoice_line_items table
CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invoice line items" ON public.invoice_line_items FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert invoice line items" ON public.invoice_line_items FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update invoice line items" ON public.invoice_line_items FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete invoice line items" ON public.invoice_line_items FOR DELETE USING (is_admin(auth.uid()));

-- Create quotations table
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'draft',
  expiry_date DATE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,
  converted_to_invoice BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view quotations" ON public.quotations FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert quotations" ON public.quotations FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update quotations" ON public.quotations FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete quotations" ON public.quotations FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create quotation_line_items table
CREATE TABLE public.quotation_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotation_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view quotation line items" ON public.quotation_line_items FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert quotation line items" ON public.quotation_line_items FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update quotation line items" ON public.quotation_line_items FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete quotation line items" ON public.quotation_line_items FOR DELETE USING (is_admin(auth.uid()));

-- Create document_templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'invoice',
  template_data JSONB,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view document templates" ON public.document_templates FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert document templates" ON public.document_templates FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update document templates" ON public.document_templates FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete document templates" ON public.document_templates FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON public.document_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product photos
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload product photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-photos' AND (SELECT is_admin(auth.uid())));
CREATE POLICY "Anyone can view product photos" ON storage.objects FOR SELECT USING (bucket_id = 'product-photos');
CREATE POLICY "Admins can delete product photos" ON storage.objects FOR DELETE USING (bucket_id = 'product-photos' AND (SELECT is_admin(auth.uid())));


-- ---------------------------------------------------------------------------
-- Migration: 20260303093145_3f4246c9-5aa8-44cb-9617-7e7c161feac8.sql
-- ---------------------------------------------------------------------------

-- Add recurring invoice columns
ALTER TABLE public.invoices 
  ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN recurrence_interval text DEFAULT NULL,
  ADD COLUMN next_recurrence_date date DEFAULT NULL,
  ADD COLUMN recurring_parent_id uuid REFERENCES public.invoices(id) DEFAULT NULL;

-- Index for cron job to find due recurring invoices
CREATE INDEX idx_invoices_recurring ON public.invoices (is_recurring, next_recurrence_date) WHERE is_recurring = true;


-- ---------------------------------------------------------------------------
-- Migration: 20260415123733_0bdfa25f-3f95-4c91-9c5f-d7700be15bf9.sql
-- ---------------------------------------------------------------------------

-- Add explicit INSERT/DELETE policies on user_roles restricted to super_admin only
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Add UPDATE policy on payment-proofs storage bucket for admins
CREATE POLICY "Admins can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));


-- ---------------------------------------------------------------------------
-- Migration: 20260415144151_9ea30a6d-cad6-4164-9b57-8afce2bd8e7e.sql
-- ---------------------------------------------------------------------------

-- Activity log table
CREATE TABLE public.lead_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activity_log_lead_id ON public.lead_activity_log(lead_id);
CREATE INDEX idx_lead_activity_log_created_at ON public.lead_activity_log(created_at);

ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs"
ON public.lead_activity_log FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert activity logs"
ON public.lead_activity_log FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Allow service role / triggers to insert (security definer functions handle this)

-- 1. Trigger: Lead created
CREATE OR REPLACE FUNCTION public.log_lead_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
  VALUES (NEW.id, 'created', 'Lead "' || NEW.client_name || '" was created', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_created
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_created();

-- 2. Trigger: Lead updated (stage, assignment, details)
CREATE OR REPLACE FUNCTION public.log_lead_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_stage_name text;
  new_stage_name text;
BEGIN
  -- Stage change
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.stage_id;
    SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
    INSERT INTO public.lead_activity_log (lead_id, action, description)
    VALUES (NEW.id, 'stage_changed', 'Moved from "' || COALESCE(old_stage_name, 'Unknown') || '" to "' || COALESCE(new_stage_name, 'Unknown') || '"');
  END IF;

  -- Assignment change
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    IF NEW.assigned_to IS NULL THEN
      INSERT INTO public.lead_activity_log (lead_id, action, description)
      VALUES (NEW.id, 'unassigned', 'Lead was unassigned');
    ELSE
      INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
      VALUES (NEW.id, 'assigned', 'Lead was assigned', NEW.assigned_to);
    END IF;
  END IF;

  -- Details change (name, email, phone, package, notes, source)
  IF OLD.client_name IS DISTINCT FROM NEW.client_name
     OR OLD.email IS DISTINCT FROM NEW.email
     OR OLD.phone IS DISTINCT FROM NEW.phone
     OR OLD.package IS DISTINCT FROM NEW.package
     OR OLD.notes IS DISTINCT FROM NEW.notes
     OR OLD.source IS DISTINCT FROM NEW.source THEN
    INSERT INTO public.lead_activity_log (lead_id, action, description)
    VALUES (NEW.id, 'details_updated', 'Lead details were updated');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_updated
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_updated();

-- 3. Trigger: Comment added
CREATE OR REPLACE FUNCTION public.log_comment_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
  VALUES (NEW.lead_id, 'comment_added', 'A comment was added', NEW.author_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_comment_added
AFTER INSERT ON public.lead_comments
FOR EACH ROW EXECUTE FUNCTION public.log_comment_added();

-- 4. Trigger: Checklist item toggled
CREATE OR REPLACE FUNCTION public.log_checklist_toggled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  criteria_label text;
BEGIN
  SELECT label INTO criteria_label FROM public.stage_criteria WHERE id = NEW.criteria_id;
  IF NEW.checked AND NOT OLD.checked THEN
    INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
    VALUES (NEW.lead_id, 'checklist_checked', 'Checked: "' || COALESCE(criteria_label, 'Unknown') || '"', NEW.checked_by);
  ELSIF NOT NEW.checked AND OLD.checked THEN
    INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
    VALUES (NEW.lead_id, 'checklist_unchecked', 'Unchecked: "' || COALESCE(criteria_label, 'Unknown') || '"', NEW.checked_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_checklist_toggled
AFTER UPDATE ON public.lead_criteria_checks
FOR EACH ROW EXECUTE FUNCTION public.log_checklist_toggled();

-- 5. Trigger: Lead assignment table changes (multi-assign)
CREATE OR REPLACE FUNCTION public.log_lead_assignment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assignee_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(full_name, email) INTO assignee_name FROM public.profiles WHERE user_id = NEW.user_id;
    INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
    VALUES (NEW.lead_id, 'assigned', COALESCE(assignee_name, 'Someone') || ' was assigned', NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(full_name, email) INTO assignee_name FROM public.profiles WHERE user_id = OLD.user_id;
    INSERT INTO public.lead_activity_log (lead_id, action, description)
    VALUES (OLD.lead_id, 'unassigned', COALESCE(assignee_name, 'Someone') || ' was unassigned');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_lead_assignment_change
AFTER INSERT OR DELETE ON public.lead_assignments
FOR EACH ROW EXECUTE FUNCTION public.log_lead_assignment_change();


-- ---------------------------------------------------------------------------
-- Migration: 20260415144240_e3e2cd57-1841-4262-9d77-6ac8a8a4343e.sql
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activity_log;

-- ---------------------------------------------------------------------------
-- Migration: 20260421082040_44ae81c5-4451-4f63-ad5f-331ca3ca5009.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS vat_number text;

-- ---------------------------------------------------------------------------
-- Migration: 20260422102254_d850400b-11c4-4e87-8e07-f773b593a3e7.sql
-- ---------------------------------------------------------------------------

-- Key/value site settings (one row per section)
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete site settings"
  ON public.site_settings FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cards / steps (about cards + how-it-works steps)
CREATE TABLE public.site_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL, -- 'about' | 'how_it_works'
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Sparkles',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view site cards"
  ON public.site_cards FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site cards"
  ON public.site_cards FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update site cards"
  ON public.site_cards FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete site cards"
  ON public.site_cards FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_site_cards_updated_at
  BEFORE UPDATE ON public.site_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX site_cards_section_position_idx ON public.site_cards(section, position);

-- Seed defaults
INSERT INTO public.site_settings (key, value) VALUES
  ('about', '{"heading_prefix":"About","heading_accent":"SEDGE Pro","intro":"SEDGE Pro powers better project performance through a hybrid model that combines powerful project management software with on-demand project expertise. We exist to strengthen service delivery excellence, value for money, and shared success across the built environment. By aligning digital systems with practical industry expertise, we help drive better outcomes for organisations, projects, and the construction sector as a whole."}'::jsonb),
  ('how_it_works', '{"heading_prefix":"How It","heading_accent":"Works","intro":"We provide you with a service using our software and manage the entire process, so you focus on the business whilst we provide you with all the project data you need to make business and project decisions and for continual performance improvements."}'::jsonb),
  ('contact', '{"heading_prefix":"Need More","heading_accent":"Information?","intro":"Get in touch and our team will respond within 24 hours.","email":"info@sedgepro.co.za","phone":"065 075 3731","address":"Johannesburg, South Africa"}'::jsonb),
  ('prelaunch', '{"deadline":"2026-04-30T23:59:59","once_off":"R20,000","monthly":"R3,000","original":"R100,000","valid_until_label":"Offer valid until 30 April 2026"}'::jsonb);

-- Seed about cards
INSERT INTO public.site_cards (section, title, description, icon, position) VALUES
  ('about', 'Contractor Performance & Profitability', 'We provide contractors with a simple-to-use service that enables them to track and manage their site progress, productivity, profitability, cost reports and generate project estimates and payments all aimed at strengthening their project control systems and build resilient businesses.', 'ShieldCheck', 0),
  ('about', 'Oversight & Industry Performance', 'We provide a digital collaborative platform to clients, consultants and contractors for efficient and high-quality development of projects across the IDMS stages from project planning, design development, documentation, procurement, execution, handover and closeout.', 'Users', 1),
  ('about', 'Structured Professional Collaboration', 'We provide a digital collaborative platform that construction value chain stakeholders for efficient and high-quality development of projects across the various IDMS stages from project planning, design development, documentation, procurement, execution, handover and closeout.', 'BarChart3', 2),
  ('about', 'Graduate Professional Development', 'We provide unemployed graduates with professional mentoring, relevant experience, link their post graduate research to industry needs whilst providing affordable industry capacity to contractors, clients and consultants.', 'GraduationCap', 3);

-- Seed how-it-works steps
INSERT INTO public.site_cards (section, title, description, icon, position) VALUES
  ('how_it_works', 'Project Setup & Access', 'We setup your project within 48 hours so your workload is offloaded promptly', 'Settings', 0),
  ('how_it_works', 'Capture Data', 'You upload or create in-system documents using our built-in templates', 'FileText', 1),
  ('how_it_works', 'Auto Reports', 'We generate all your project/business reports and file your records', 'BarChart3', 2),
  ('how_it_works', 'Performance Tracking', 'We provide you with a executive dashboard for decision making', 'Bell', 3),
  ('how_it_works', 'Decide', 'You make the decisions, we provide professional advice', 'CheckCircle', 4),
  ('how_it_works', 'Continual Improvement', 'We share lessons learnt and industry insights for improving your business and project performance.', 'TrendingUp', 5);


-- ---------------------------------------------------------------------------
-- Migration: 20260422105918_7e0351ea-7eef-4bf0-99a5-3044b21d409e.sql
-- ---------------------------------------------------------------------------
-- Add missing UPDATE policy on product-photos bucket so admins can replace files,
-- and so the policy set is complete (insert/update/delete/select all admin-restricted).
CREATE POLICY "Admins can update product-photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-photos' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'product-photos' AND public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Migration: 20260422111804_243f12cc-cff0-4d07-8fe8-e2f18ae6df99.sql
-- ---------------------------------------------------------------------------
-- 1. Harden user_roles: explicit restrictive UPDATE policy preventing any updates.
-- Role changes must happen via DELETE + INSERT by super_admin only.
DROP POLICY IF EXISTS "No updates allowed on user_roles" ON public.user_roles;
CREATE POLICY "No updates allowed on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

-- 2. Restrict site_settings public read to a known allowlist of public keys.
-- Prevents future sensitive keys from leaking by default.
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view public site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('about', 'how_it_works', 'contact', 'prelaunch'));

-- Admins can still see everything
DROP POLICY IF EXISTS "Admins can view all site settings" ON public.site_settings;
CREATE POLICY "Admins can view all site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Migration: 20260423063925_0d8cfb95-68ce-4fc6-8548-a2b3a132d2f9.sql
-- ---------------------------------------------------------------------------
-- Create email_log table for tracking all transactional emails
CREATE TABLE public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL CHECK (email_type IN ('invoice', 'quotation', 'payment_confirmation', 'admin_invite')),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  related_id UUID,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_email_log_related_id ON public.email_log(related_id);
CREATE INDEX idx_email_log_created_at ON public.email_log(created_at DESC);
CREATE INDEX idx_email_log_email_type ON public.email_log(email_type);

-- Enable RLS
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can view email log"
ON public.email_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies — only service role can write (bypasses RLS)


-- ---------------------------------------------------------------------------
-- Migration: 20260423065652_1e630a6a-c560-4716-bfb4-3697cdad2b77.sql
-- ---------------------------------------------------------------------------
-- Seed the "videos" site_settings row used by the landing page Watch buttons.
INSERT INTO public.site_settings (key, value)
VALUES (
  'videos',
  '{
    "project_video_id": "dQw4w9WgXcQ",
    "project_video_label": "Watch Project Performance video",
    "business_video_id": "dQw4w9WgXcQ",
    "business_video_label": "Watch Business Performance demo"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Allow anonymous + authenticated visitors to read the videos config.
DROP POLICY IF EXISTS "Public can view public site settings" ON public.site_settings;

CREATE POLICY "Public can view public site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['about'::text, 'how_it_works'::text, 'contact'::text, 'prelaunch'::text, 'videos'::text]));

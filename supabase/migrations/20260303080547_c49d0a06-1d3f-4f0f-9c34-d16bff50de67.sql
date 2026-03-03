
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

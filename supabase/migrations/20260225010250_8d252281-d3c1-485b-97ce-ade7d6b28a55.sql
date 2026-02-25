
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

-- Migration for Packages Pricing Tiers and Expireable Promotions

-- 1. Create package_pricing_tiers table
CREATE TABLE IF NOT EXISTS public.package_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents integer NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly', -- 'once_off', 'monthly', 'annual'
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.package_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active pricing tiers" ON public.package_pricing_tiers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all pricing tiers" ON public.package_pricing_tiers
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert pricing tiers" ON public.package_pricing_tiers
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update pricing tiers" ON public.package_pricing_tiers
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete pricing tiers" ON public.package_pricing_tiers
  FOR DELETE USING (is_admin(auth.uid()));

-- Trigger for updated_at on package_pricing_tiers
CREATE OR REPLACE TRIGGER update_package_pricing_tiers_updated_at
  BEFORE UPDATE ON public.package_pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE, -- NULL means automatic, pre-applied promotion
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value integer NOT NULL, -- e.g. 20 for 20% or 50000 for R500
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  applicable_package_ids uuid[], -- NULL means applies to all packages
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active promotions" ON public.promotions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all promotions" ON public.promotions
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert promotions" ON public.promotions
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update promotions" ON public.promotions
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete promotions" ON public.promotions
  FOR DELETE USING (is_admin(auth.uid()));

-- Trigger for updated_at on promotions
CREATE OR REPLACE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Seed pricing tiers for existing packages (backward compatibility)
DO $$
DECLARE
  claims_id uuid;
  qs_id uuid;
  full_id uuid;
  promo_id uuid;
BEGIN
  -- Clear existing packages to seed new ones cleanly
  -- Cascades automatically to package_pricing_tiers
  TRUNCATE TABLE public.packages CASCADE;
  TRUNCATE TABLE public.promotions CASCADE;

  -- 1. claims and certificate management
  INSERT INTO public.packages (name, price_cents, features, is_popular, position)
  VALUES (
    'claims and certificate management',
    299700,
    ARRAY['Professional certificate generation', 'Claims tracking', 'Automated invoicing', 'Client portal access'],
    false,
    0
  ) RETURNING id INTO claims_id;

  INSERT INTO public.package_pricing_tiers (package_id, name, price_cents, billing_cycle, position) VALUES
    (claims_id, 'Once-off Payment', 299700, 'once_off', 0),
    (claims_id, 'Monthly instalments', 29900, 'monthly', 1);

  -- 2. qs and contracts management
  INSERT INTO public.packages (name, price_cents, features, is_popular, position)
  VALUES (
    'qs and contracts management',
    499700,
    ARRAY['Quantity surveying tools', 'Contract template library', 'Subcontractor portal', 'Budget & cost control'],
    false,
    1
  ) RETURNING id INTO qs_id;

  INSERT INTO public.package_pricing_tiers (package_id, name, price_cents, billing_cycle, position) VALUES
    (qs_id, 'Once-off Payment', 499700, 'once_off', 0),
    (qs_id, 'Monthly instalments', 49900, 'monthly', 1);

  -- 3. full package
  INSERT INTO public.packages (name, price_cents, features, is_popular, position)
  VALUES (
    'full package',
    999700,
    ARRAY['All claims & certificates tools', 'All QS & contracts tools', 'Full financial analytics', 'Dedicated support specialist', 'Unlimited users & projects'],
    false,
    2
  ) RETURNING id INTO full_id;

  INSERT INTO public.package_pricing_tiers (package_id, name, price_cents, billing_cycle, position) VALUES
    (full_id, 'Once-off Payment', 999700, 'once_off', 0),
    (full_id, 'Monthly instalments', 99900, 'monthly', 1);

  -- 4. Pre-launch Promotion package
  INSERT INTO public.packages (name, price_cents, features, is_popular, position)
  VALUES (
    'Pre-launch Promotion',
    500000,
    ARRAY['Full access to all system modules', 'Ongoing remote expert support', 'Unlimited users', 'Unlimited projects', 'Guided remote onboarding and setup'],
    true,
    3
  ) RETURNING id INTO promo_id;

  -- The pre-launch prices from site settings are R5000 once-off and R700 monthly
  INSERT INTO public.package_pricing_tiers (package_id, name, price_cents, billing_cycle, position) VALUES
    (promo_id, 'Once-off Payment', 500000, 'once_off', 0),
    (promo_id, 'Monthly instalments', 70000, 'monthly', 1);

  -- 5. Seed Pre-launch promotion into promotions table (auto-applied!)
  INSERT INTO public.promotions (name, code, discount_type, discount_value, start_date, end_date, is_active, applicable_package_ids)
  VALUES (
    'Pre-launch Promotion Discount',
    'PRELAUNCH',
    'percentage',
    20, -- Seed a 20% discount coupon code 'PRELAUNCH'
    now(),
    now() + interval '365 days',
    true,
    ARRAY[promo_id, full_id] -- applies to the Pre-launch Promotion and Full Package
  );

  -- Seed another auto-applied seasonal discount for testing auto-applied promotions!
  INSERT INTO public.promotions (name, code, discount_type, discount_value, start_date, end_date, is_active, applicable_package_ids)
  VALUES (
    'Welcome Discount (Auto-Applied)',
    NULL, -- NULL code means auto-applied!
    'percentage',
    10, -- 10% auto-applied discount for all new visitors!
    now(),
    now() + interval '180 days',
    true,
    NULL -- NULL applicable_package_ids means applies to all packages
  );

END $$;

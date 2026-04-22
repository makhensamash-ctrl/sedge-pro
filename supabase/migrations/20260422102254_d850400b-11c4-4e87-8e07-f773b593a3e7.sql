
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

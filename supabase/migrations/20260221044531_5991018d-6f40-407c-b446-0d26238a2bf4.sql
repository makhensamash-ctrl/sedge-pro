
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

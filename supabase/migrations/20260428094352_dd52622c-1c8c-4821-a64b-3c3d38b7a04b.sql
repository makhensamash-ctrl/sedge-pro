-- Track unique visitors to the public site
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_visits_created_at ON public.site_visits(created_at DESC);
CREATE INDEX idx_site_visits_visitor_id ON public.site_visits(visitor_id);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can log a visit
CREATE POLICY "Anyone can record a visit"
  ON public.site_visits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read visit data
CREATE POLICY "Admins can view visits"
  ON public.site_visits
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

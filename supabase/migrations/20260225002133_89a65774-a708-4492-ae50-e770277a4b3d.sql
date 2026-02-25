
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

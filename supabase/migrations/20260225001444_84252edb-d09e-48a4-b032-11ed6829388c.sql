
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

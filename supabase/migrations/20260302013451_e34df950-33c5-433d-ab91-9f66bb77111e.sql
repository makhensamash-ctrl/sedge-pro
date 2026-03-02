
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

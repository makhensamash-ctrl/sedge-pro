
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

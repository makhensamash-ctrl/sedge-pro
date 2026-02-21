
-- Add assigned_to column to leads
ALTER TABLE public.leads ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Create lead_comments table
CREATE TABLE public.lead_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lead comments"
  ON public.lead_comments FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert lead comments"
  ON public.lead_comments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete own comments"
  ON public.lead_comments FOR DELETE
  USING (author_id = auth.uid());

-- Create email_log table for tracking all transactional emails
CREATE TABLE public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL CHECK (email_type IN ('invoice', 'quotation', 'payment_confirmation', 'admin_invite')),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  related_id UUID,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_email_log_related_id ON public.email_log(related_id);
CREATE INDEX idx_email_log_created_at ON public.email_log(created_at DESC);
CREATE INDEX idx_email_log_email_type ON public.email_log(email_type);

-- Enable RLS
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can view email log"
ON public.email_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies — only service role can write (bypasses RLS)


-- Add recurring invoice columns
ALTER TABLE public.invoices 
  ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN recurrence_interval text DEFAULT NULL,
  ADD COLUMN next_recurrence_date date DEFAULT NULL,
  ADD COLUMN recurring_parent_id uuid REFERENCES public.invoices(id) DEFAULT NULL;

-- Index for cron job to find due recurring invoices
CREATE INDEX idx_invoices_recurring ON public.invoices (is_recurring, next_recurrence_date) WHERE is_recurring = true;

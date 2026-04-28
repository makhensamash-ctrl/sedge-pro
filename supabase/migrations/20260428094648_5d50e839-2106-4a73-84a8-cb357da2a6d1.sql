ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS recurrence_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurrence_max INTEGER;

COMMENT ON COLUMN public.invoices.recurrence_count IS 'Number of child invoices generated from this recurring template (excludes the original).';
COMMENT ON COLUMN public.invoices.recurrence_max IS 'Maximum number of child invoices to generate. NULL = unlimited. When count >= max, generator stops and clears next_recurrence_date.';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS vat_number text;
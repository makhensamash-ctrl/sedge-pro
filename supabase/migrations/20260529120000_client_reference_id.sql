-- Add reference_id column to public.clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Create helper function to generate a random 5-character alphanumeric client reference with 'CLI-' prefix
CREATE OR REPLACE FUNCTION public.generate_client_reference()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT;
  i INTEGER;
  done BOOLEAN := false;
BEGIN
  WHILE NOT done LOOP
    result := 'CLI-';
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check uniqueness in the clients table
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE reference_id = result) THEN
      done := true;
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Populate reference_id for all existing clients retroactively
UPDATE public.clients 
SET reference_id = public.generate_client_reference() 
WHERE reference_id IS NULL;

-- Enforce UNIQUE and NOT NULL constraints on reference_id
ALTER TABLE public.clients ALTER COLUMN reference_id SET NOT NULL;
ALTER TABLE public.clients ADD CONSTRAINT clients_reference_id_key UNIQUE (reference_id);

-- Create a trigger function to automatically set the reference_id on new inserts
CREATE OR REPLACE FUNCTION public.set_client_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := public.generate_client_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE INSERT trigger on public.clients
CREATE OR REPLACE TRIGGER trigger_set_client_reference_id
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_client_reference_id();

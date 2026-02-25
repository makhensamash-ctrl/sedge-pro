-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Admins can upload payment proofs
CREATE POLICY "Admins can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

-- Admins can view payment proofs
CREATE POLICY "Admins can view payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

-- Admins can delete payment proofs
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

-- Add proof_url column to payments
ALTER TABLE public.payments ADD COLUMN proof_url text;
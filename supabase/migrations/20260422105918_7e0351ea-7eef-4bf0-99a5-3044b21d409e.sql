-- Add missing UPDATE policy on product-photos bucket so admins can replace files,
-- and so the policy set is complete (insert/update/delete/select all admin-restricted).
CREATE POLICY "Admins can update product-photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-photos' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'product-photos' AND public.is_admin(auth.uid()));
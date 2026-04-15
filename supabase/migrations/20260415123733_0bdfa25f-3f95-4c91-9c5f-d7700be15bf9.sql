
-- Add explicit INSERT/DELETE policies on user_roles restricted to super_admin only
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Add UPDATE policy on payment-proofs storage bucket for admins
CREATE POLICY "Admins can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

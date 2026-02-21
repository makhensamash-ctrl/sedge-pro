
-- Drop overly permissive policies and replace with role-checked ones
DROP POLICY "Service role can insert profiles" ON public.profiles;
DROP POLICY "Service role can insert payments" ON public.payments;
DROP POLICY "Service role can update payments" ON public.payments;

-- Profiles: allow insert for authenticated users on their own profile (trigger handles this)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Payments: only admins can insert/update via client; edge functions use service_role which bypasses RLS
CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

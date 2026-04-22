-- 1. Harden user_roles: explicit restrictive UPDATE policy preventing any updates.
-- Role changes must happen via DELETE + INSERT by super_admin only.
DROP POLICY IF EXISTS "No updates allowed on user_roles" ON public.user_roles;
CREATE POLICY "No updates allowed on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

-- 2. Restrict site_settings public read to a known allowlist of public keys.
-- Prevents future sensitive keys from leaking by default.
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view public site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('about', 'how_it_works', 'contact', 'prelaunch'));

-- Admins can still see everything
DROP POLICY IF EXISTS "Admins can view all site settings" ON public.site_settings;
CREATE POLICY "Admins can view all site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
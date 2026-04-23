
DROP POLICY IF EXISTS "Public can view public site settings" ON public.site_settings;

CREATE POLICY "Public can view public site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['about'::text, 'how_it_works'::text, 'contact'::text, 'prelaunch'::text, 'videos'::text, 'hero'::text]));

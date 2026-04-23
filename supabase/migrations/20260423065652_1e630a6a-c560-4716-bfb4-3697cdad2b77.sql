-- Seed the "videos" site_settings row used by the landing page Watch buttons.
INSERT INTO public.site_settings (key, value)
VALUES (
  'videos',
  '{
    "project_video_id": "dQw4w9WgXcQ",
    "project_video_label": "Watch Project Performance video",
    "business_video_id": "dQw4w9WgXcQ",
    "business_video_label": "Watch Business Performance demo"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Allow anonymous + authenticated visitors to read the videos config.
DROP POLICY IF EXISTS "Public can view public site settings" ON public.site_settings;

CREATE POLICY "Public can view public site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['about'::text, 'how_it_works'::text, 'contact'::text, 'prelaunch'::text, 'videos'::text]));
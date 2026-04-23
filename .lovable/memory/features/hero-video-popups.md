---
name: Hero video popups
description: Watch buttons open YouTube in an in-site modal; IDs are admin-editable
type: feature
---
- HeroSection's two "Watch" buttons no longer link out to YouTube. They open a `VideoModal` (`src/components/VideoModal.tsx`) that embeds the video via youtube-nocookie iframe with autoplay.
- Video IDs + button labels live in `site_settings` under key `videos`:
  - `project_video_id`, `project_video_label`
  - `business_video_id`, `business_video_label`
- Editable from Admin → Content Manager → "Videos" tab.
- Public RLS on `site_settings` includes `videos` so anon visitors can read it.
- Never re-introduce direct `<a href="youtube.com/...">` for these buttons — visitors must stay on-site.

---
name: Migration bundle
description: Files needed to lift the project off Lovable Cloud onto supabase.com directly
type: reference
---
- `MIGRATION.md` — step-by-step guide (DB, secrets, edge functions, deploy, bootstrap admin).
- `.env.example` — every env var the app reads (frontend `VITE_*`, edge `SUPABASE_*`, `RESEND_API_KEY`, `Yoco_Secret`, `DEFAULT_ADMIN_PASSWORD`).
- `migration/schema.sql` — consolidated dump of all migrations; runnable on a fresh Supabase project in one shot.
- `docker-compose.yml` — local Postgres for dev (port 54322); auto-applies schema.
- Edge functions deploy via `supabase functions deploy`; `verify_jwt = false` set in `supabase/config.toml` for `create-yoco-checkout`, `yoco-webhook`, `create-lead`, `invite-admin`.
- Resend uses raw fetch to `api.resend.com` with `RESEND_API_KEY` — fully portable, no Lovable dependency.
- `LOVABLE_API_KEY` is NOT required by any production path; safe to drop after migration.

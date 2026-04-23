# Migrating SEDGE Pro off Lovable Cloud → Supabase.com (direct)

This guide moves the project from Lovable-managed Supabase to your own
Supabase.com project, while keeping the same codebase. No code rewrite needed —
only environment variables and where the database/edge functions live.

---

## 0. What you'll have after migration

- **Frontend**: same Vite + React app, deployed anywhere (Vercel, Netlify, your VPS)
- **Database / Auth / Storage**: your own Supabase.com project
- **Edge Functions**: deployed to your Supabase project via the Supabase CLI
- **Secrets**: managed in Supabase Dashboard → Project Settings → Edge Functions → Secrets

---

## 1. Create a fresh Supabase project

1. Go to <https://supabase.com> → **New project**.
2. Pick a region close to South Africa (e.g. `eu-west-1` or `eu-central-1`).
3. Note your project ref (e.g. `abcdwxyz`) and database password.
4. Settings → API → copy:
   - **Project URL** → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (NEVER expose client-side)

---

## 2. Apply the database schema

`migration/schema.sql` is a consolidated dump of every table, RLS policy,
function, trigger, enum and seed needed by the app.

### Option A — Supabase Dashboard (easiest)

1. Open your new project → **SQL Editor** → **New query**.
2. Paste the contents of `migration/schema.sql`.
3. Click **Run**.

### Option B — psql (recommended for repeatable deploys)

```bash
psql "postgres://postgres:YOUR-DB-PASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres" \
  -f migration/schema.sql
```

### Option C — Supabase CLI

```bash
npm i -g supabase
supabase link --project-ref YOUR-PROJECT-REF
supabase db push   # applies every file in supabase/migrations/ in order
```

---

## 3. Storage buckets

The app uses two buckets. Create them in Storage → Buckets:

| Bucket           | Public | Notes                                      |
|------------------|--------|--------------------------------------------|
| `payment-proofs` | No     | Signed URLs only; bank-transfer POPs       |
| `product-photos` | Yes    | Public read; admin-only write              |

The bucket policies are included in `schema.sql`.

---

## 4. Configure secrets (Edge Functions)

Supabase Dashboard → Project Settings → **Edge Functions** → **Secrets**.
Add every entry from `.env.example` that is server-side:

```
RESEND_API_KEY            → from https://resend.com
Yoco_Secret               → from https://portal.yoco.com
DEFAULT_ADMIN_PASSWORD    → strong temp password for new admins
SUPABASE_SERVICE_ROLE_KEY → already auto-injected by Supabase
SUPABASE_URL              → already auto-injected
SUPABASE_ANON_KEY         → already auto-injected
```

You do **NOT** need `LOVABLE_API_KEY` — Lovable AI Gateway is not used by any
production code path. The Resend integration uses raw `fetch` to
`api.resend.com`, so it is fully portable.

---

## 5. Deploy edge functions

From the project root:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy --no-verify-jwt create-yoco-checkout
supabase functions deploy --no-verify-jwt yoco-webhook
supabase functions deploy --no-verify-jwt create-lead
supabase functions deploy --no-verify-jwt invite-admin
supabase functions deploy create-eft-checkout
supabase functions deploy generate-recurring-invoices
supabase functions deploy send-admin-invite-email
supabase functions deploy send-invoice-email
supabase functions deploy send-payment-confirmation
supabase functions deploy send-quotation-email
```

The four functions with `--no-verify-jwt` are intentionally public (matches
`supabase/config.toml`):

- `create-yoco-checkout` — called from the public landing page
- `yoco-webhook` — called by Yoco's servers
- `create-lead` — called by external integrations / chatbot
- `invite-admin` — gated by service role inside the function body

All other functions verify JWTs.

---

## 6. Webhooks & external services

- **Yoco**: portal.yoco.com → Webhooks → set to
  `https://YOUR-PROJECT-REF.supabase.co/functions/v1/yoco-webhook`
- **Resend** (optional): verify your sending domain (e.g. `sedgeaccelerator.co.za`)
  and update the `from` constant in `supabase/functions/_shared/email-template.ts`
  to use `noreply@your-domain.com`.

---

## 7. Frontend build & deploy

```bash
cp .env.example .env.local      # fill in the VITE_* values
npm install
npm run build
```

Deploy `dist/` to Vercel / Netlify / Cloudflare Pages / your own server.

Set the `VITE_*` env vars on your hosting provider so the build picks them up.

---

## 8. Bootstrap the first admin

After deployment, create the first super admin manually in the Supabase
Dashboard → Authentication → Users → **Add user** (with email + password).

Then in SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<new-user-uuid>', 'super_admin');
```

Login at `https://your-domain/admin` and invite further admins from the UI.

---

## 9. Optional: local dev with Docker

```bash
docker compose up -d         # Postgres only, schema auto-applied
# OR for full stack parity:
supabase start               # spins up Postgres + Auth + Storage + Studio locally
supabase functions serve     # run edge functions locally with .env.local
```

---

## 10. Verifying the migration

Smoke-test these flows after switchover:

- [ ] Public landing page loads, prices visible, Watch video popups open
- [ ] Chatbot lead → creates row in `leads`
- [ ] `/admin` login works for the bootstrapped super admin
- [ ] Create + send an invoice → email arrives via Resend; row appears in `email_log`
- [ ] Create a Yoco checkout from a package → webhook updates `payments` to `completed`
- [ ] Invite a new admin → invite email arrives; first-login password change enforced

---

## File layout

```
.env.example              # every env var the app reads
docker-compose.yml        # local Postgres
migration/
  └── schema.sql          # consolidated DB schema + RLS + seeds
supabase/
  ├── config.toml         # function-level config (verify_jwt overrides)
  ├── functions/          # all edge functions (deploy as-is)
  └── migrations/         # historical migrations (use `supabase db push`)
```

Either `migration/schema.sql` (one-shot) or `supabase/migrations/` (incremental)
can rebuild the database from scratch — pick whichever fits your workflow.

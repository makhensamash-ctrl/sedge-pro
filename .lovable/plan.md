

## Resend Email System (Direct API Key)

Wire up Resend using a stored API key directly (no Lovable connector gateway), so the integration travels cleanly with the codebase if you ever migrate off Lovable.

### What you'll get

**1. "Send" buttons in admin**
- Invoices page → new "Send" action on each invoice. Confirm dialog → sends branded HTML email with PDF attached → marks invoice as `sent`.
- Quotations page → identical "Send" action.

**2. Automatic payment confirmation emails**
- Yoco webhook, after marking a payment `completed`, triggers a "Payment received" email to the customer with invoice number, amount, and date.

**3. Branded admin invite emails**
- `invite-admin` function sends a welcome email with temporary password and `/admin` login link to new admins.

**4. Email log (admin visibility)**
- New `email_log` table records every send (recipient, subject, type, status, error). Surfaced as a collapsible "Email history" panel on the Invoices page.

### Email design

Shared HTML template used by all functions:
- Navy header bar with SEDGE Pro wordmark
- Green accent CTA buttons
- Body: invoice/quotation/payment summary table
- Footer: contact email, phone, POPIA note
- **From**: `SEDGE Pro <onboarding@resend.dev>` (single constant — swap to your verified domain later)
- **Reply-to**: contact email of the invoice/quotation's business profile, fallback `info@sedgeaccelerator.co.za`

### Technical approach

**Secret**: You'll provide `RESEND_API_KEY` (from resend.com → API Keys). Stored as a Lovable Cloud secret. Edge functions call Resend directly:

```ts
await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ from, to, subject, html, reply_to, attachments }),
});
```

No connector gateway, no `LOVABLE_API_KEY` dependency — fully portable.

**New edge functions** (each self-contained, inline HTML template helper at top of file):
- `send-invoice-email` — admin-auth required. Loads invoice + line items + business profile + client. Renders HTML, attaches PDF (base64 from request body), sends via Resend, logs to `email_log`, sets invoice `status = 'sent'`.
- `send-quotation-email` — same pattern for quotations.
- `send-admin-invite-email` — invoked internally by `invite-admin` after user creation.
- `send-payment-confirmation` — invoked internally by `yoco-webhook` after marking payment completed.

**Modified:**
- `yoco-webhook` → calls `send-payment-confirmation` via `supabase.functions.invoke` (service-role) on success.
- `invite-admin` → calls `send-admin-invite-email` after creating user / assigning role.
- `Invoices.tsx` & `Quotations.tsx` → add Send button + confirm dialog. Client generates PDF blob with existing `@react-pdf/renderer` setup, base64-encodes, posts to the edge function.

**New table:**
```sql
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  email_type text not null,        -- 'invoice' | 'quotation' | 'payment_confirmation' | 'admin_invite'
  recipient text not null,
  subject text not null,
  related_id uuid,                 -- invoice/quotation/user id
  status text not null,            -- 'sent' | 'failed'
  error_message text,
  sent_by uuid references auth.users(id),
  created_at timestamptz default now()
);
-- RLS: admins SELECT, service role INSERT only
```

**PDF attachment limit**: Resend caps attachments at ~40MB; invoices are well under 1MB so no issue. Falls back to a "View invoice" link in body if PDF generation fails.

**Migration portability**: Because everything runs through `RESEND_API_KEY` + raw `fetch` to `api.resend.com`, the entire email stack works on any Deno/Node host with that env var set. No Lovable-specific code.

### Setup steps you'll see
1. Run a migration creating `email_log`.
2. I'll request you add the `RESEND_API_KEY` secret (you'll get it from resend.com → API Keys → Create).
3. Edge functions deploy automatically.
4. Test by hitting "Send" on a draft invoice.

### Out of scope
- Verifying `sedgeaccelerator.co.za` in Resend (do later from Resend dashboard, then swap one constant).
- Editable email templates in admin UI.
- Bulk send / scheduled sends / unsubscribe management.


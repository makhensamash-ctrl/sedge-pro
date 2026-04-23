// Shared HTML email template builder for SEDGE Pro transactional emails.
// Used by send-invoice-email, send-quotation-email, send-payment-confirmation, send-admin-invite-email.

export const FROM_ADDRESS = "SEDGE Pro <onboarding@resend.dev>";
export const FALLBACK_REPLY_TO = "info@sedgeaccelerator.co.za";
export const FALLBACK_PHONE = "065 075 3731";

interface SummaryRow {
  label: string;
  value: string;
}

export interface TemplateOptions {
  preheader: string;
  heading: string;
  intro: string;
  summary?: SummaryRow[];
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
  contactPhone?: string;
  contactEmail?: string;
  businessName?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderEmail(opts: TemplateOptions): string {
  const navy = "#0A2540";
  const green = "#22C55E";
  const muted = "#64748B";
  const border = "#E2E8F0";
  const bg = "#F8FAFC";

  const summaryHtml = opts.summary && opts.summary.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:24px 0;border:1px solid ${border};border-radius:8px;overflow:hidden;">
        ${opts.summary.map((row, i) => `
          <tr style="background:${i % 2 === 0 ? "#fff" : bg};">
            <td style="padding:12px 16px;color:${muted};font-size:14px;border-bottom:1px solid ${border};">${escapeHtml(row.label)}</td>
            <td style="padding:12px 16px;color:${navy};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid ${border};">${escapeHtml(row.value)}</td>
          </tr>`).join("")}
      </table>`
    : "";

  const ctaHtml = opts.ctaLabel && opts.ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
        <tr><td style="border-radius:6px;background:${green};">
          <a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;padding:12px 28px;color:#fff;font-weight:600;text-decoration:none;font-size:15px;">${escapeHtml(opts.ctaLabel)}</a>
        </td></tr>
      </table>`
    : "";

  const businessName = opts.businessName || "SEDGE Pro";
  const phone = opts.contactPhone || FALLBACK_PHONE;
  const email = opts.contactEmail || FALLBACK_REPLY_TO;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${navy};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
        <tr><td style="background:${navy};padding:28px 32px;">
          <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px;">SEDGE <span style="color:${green};">Pro</span></div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:22px;color:${navy};font-weight:700;">${escapeHtml(opts.heading)}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">${opts.intro}</p>
          ${summaryHtml}
          ${ctaHtml}
          ${opts.footnote ? `<p style="margin:24px 0 0;font-size:13px;color:${muted};line-height:1.6;">${opts.footnote}</p>` : ""}
        </td></tr>
        <tr><td style="background:${bg};padding:20px 32px;border-top:1px solid ${border};">
          <p style="margin:0;font-size:12px;color:${muted};line-height:1.6;">
            <strong style="color:${navy};">${escapeHtml(businessName)}</strong><br>
            📧 <a href="mailto:${escapeHtml(email)}" style="color:${muted};text-decoration:none;">${escapeHtml(email)}</a> &nbsp;•&nbsp; 📞 ${escapeHtml(phone)}<br>
            <span style="color:#94A3B8;">This email was sent in line with our POPIA-compliant privacy practices.</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string }>; // base64
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmailViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo || FALLBACK_REPLY_TO,
        ...(params.attachments && params.attachments.length ? { attachments: params.attachments } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.message || `Resend HTTP ${res.status}` };
    return { ok: true, id: json?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function logEmail(
  supabaseAdmin: any,
  row: {
    email_type: "invoice" | "quotation" | "payment_confirmation" | "admin_invite";
    recipient: string;
    subject: string;
    related_id?: string | null;
    status: "sent" | "failed";
    error_message?: string | null;
    sent_by?: string | null;
  }
) {
  try {
    await supabaseAdmin.from("email_log").insert(row);
  } catch (e) {
    console.error("Failed to write email_log row:", e);
  }
}

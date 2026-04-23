import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderEmail, sendEmailViaResend, logEmail, FALLBACK_REPLY_TO } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmtR = (n: number) => `R${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Auth: must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdminRow } = await supabaseAdmin.rpc("is_admin", { _user_id: caller.id });
    if (!isAdminRow) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const invoiceId: string | undefined = body.invoiceId;
    const recipientOverride: string | undefined = body.recipient;
    const pdfBase64: string | undefined = body.pdfBase64;

    if (!invoiceId || typeof invoiceId !== "string") {
      return new Response(JSON.stringify({ error: "invoiceId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select(`*, clients(name, email, company), business_profiles(business_name, contact_phone)`)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const recipient = (recipientOverride || invoice.clients?.email || "").trim();
    if (!recipient) {
      return new Response(JSON.stringify({ error: "No recipient email available for this invoice" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const businessName = invoice.business_profiles?.business_name || "SEDGE Pro";
    const replyTo = invoice.business_profiles?.contact_phone ? FALLBACK_REPLY_TO : FALLBACK_REPLY_TO;

    const subject = `Invoice ${invoice.invoice_number} from ${businessName}`;
    const summary = [
      { label: "Invoice number", value: invoice.invoice_number },
      { label: "Issue date", value: new Date(invoice.issue_date).toLocaleDateString("en-ZA") },
      ...(invoice.due_date ? [{ label: "Due date", value: new Date(invoice.due_date).toLocaleDateString("en-ZA") }] : []),
      { label: "Total amount", value: fmtR(Number(invoice.total_amount)) },
      { label: "Status", value: String(invoice.status) },
    ];

    const html = renderEmail({
      preheader: `Your invoice ${invoice.invoice_number} is attached.`,
      heading: `Invoice ${invoice.invoice_number}`,
      intro: `Hi ${invoice.clients?.name || "there"},<br><br>Please find your invoice from <strong>${businessName}</strong> attached. A summary is shown below.`,
      summary,
      footnote: invoice.notes ? `<strong>Notes:</strong> ${invoice.notes}` : "If you have any questions about this invoice, simply reply to this email.",
      businessName,
      contactPhone: invoice.business_profiles?.contact_phone || undefined,
    });

    const attachments = pdfBase64
      ? [{ filename: `invoice-${invoice.invoice_number}.pdf`, content: pdfBase64 }]
      : undefined;

    const result = await sendEmailViaResend({ to: recipient, subject, html, replyTo, attachments });

    await logEmail(supabaseAdmin, {
      email_type: "invoice",
      recipient,
      subject,
      related_id: invoice.id,
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? null : result.error,
      sent_by: caller.id,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error || "Failed to send email" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Advance invoice status from draft → invoice sent-awaiting payment
    if (invoice.status === "draft") {
      await supabaseAdmin.from("invoices").update({ status: "invoice sent-awaiting payment" }).eq("id", invoice.id);
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    console.error("send-invoice-email error:", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "An error occurred sending the invoice email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

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
    const quotationId: string | undefined = body.quotationId;
    const recipientOverride: string | undefined = body.recipient;
    const pdfBase64: string | undefined = body.pdfBase64;

    if (!quotationId || typeof quotationId !== "string") {
      return new Response(JSON.stringify({ error: "quotationId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: quotation, error: qErr } = await supabaseAdmin
      .from("quotations")
      .select(`*, clients(name, email, company), business_profiles(business_name, contact_phone)`)
      .eq("id", quotationId)
      .maybeSingle();

    if (qErr || !quotation) {
      return new Response(JSON.stringify({ error: "Quotation not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const recipient = (recipientOverride || quotation.clients?.email || "").trim();
    if (!recipient) {
      return new Response(JSON.stringify({ error: "No recipient email available for this quotation" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const businessName = quotation.business_profiles?.business_name || "SEDGE Pro";
    const subject = `Quotation ${quotation.quotation_number} from ${businessName}`;
    const summary = [
      { label: "Quotation number", value: quotation.quotation_number },
      { label: "Issue date", value: new Date(quotation.issue_date).toLocaleDateString("en-ZA") },
      ...(quotation.expiry_date ? [{ label: "Valid until", value: new Date(quotation.expiry_date).toLocaleDateString("en-ZA") }] : []),
      { label: "Total amount", value: fmtR(Number(quotation.total_amount)) },
    ];

    const html = renderEmail({
      preheader: `Your quotation ${quotation.quotation_number} is attached.`,
      heading: `Quotation ${quotation.quotation_number}`,
      intro: `Hi ${quotation.clients?.name || "there"},<br><br>Thank you for your interest in working with <strong>${businessName}</strong>. Please find your quotation attached.`,
      summary,
      footnote: quotation.notes ? `<strong>Notes:</strong> ${quotation.notes}` : "Reply to this email if you'd like to proceed or have any questions.",
      businessName,
      contactPhone: quotation.business_profiles?.contact_phone || undefined,
    });

    const attachments = pdfBase64
      ? [{ filename: `quotation-${quotation.quotation_number}.pdf`, content: pdfBase64 }]
      : undefined;

    const result = await sendEmailViaResend({ to: recipient, subject, html, replyTo: FALLBACK_REPLY_TO, attachments });

    await logEmail(supabaseAdmin, {
      email_type: "quotation",
      recipient,
      subject,
      related_id: quotation.id,
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? null : result.error,
      sent_by: caller.id,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error || "Failed to send email" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (quotation.status === "draft") {
      await supabaseAdmin.from("quotations").update({ status: "sent" }).eq("id", quotation.id);
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    console.error("send-quotation-email error:", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "An error occurred sending the quotation email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

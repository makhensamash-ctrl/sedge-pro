import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderEmail, sendEmailViaResend, logEmail, FALLBACK_REPLY_TO } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmtR = (n: number) => `R${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Service-role only: invoked internally by yoco-webhook. Verifies a shared internal token.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Internal auth: must be called with service-role key in Authorization header
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const recipient: string | undefined = body.recipient;
    const customerName: string | undefined = body.customerName;
    const packageName: string | undefined = body.packageName;
    const amountCents: number | undefined = body.amountCents;
    const paymentId: string | undefined = body.paymentId;
    const invoiceNumber: string | undefined = body.invoiceNumber;

    if (!recipient || !packageName || typeof amountCents !== "number") {
      return new Response(JSON.stringify({ error: "recipient, packageName and amountCents are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const subject = `Payment received — thank you${invoiceNumber ? ` (${invoiceNumber})` : ""}`;
    const summary = [
      ...(invoiceNumber ? [{ label: "Invoice", value: invoiceNumber }] : []),
      { label: "Item", value: packageName },
      { label: "Amount paid", value: fmtR(amountCents / 100) },
      { label: "Date", value: new Date().toLocaleDateString("en-ZA") },
    ];

    const html = renderEmail({
      preheader: `Payment received — thank you for choosing SEDGE Pro.`,
      heading: "Payment received ✓",
      intro: `Hi ${customerName || "there"},<br><br>We've received your payment. Thank you for choosing <strong>SEDGE Pro</strong>! A summary of your transaction is below.`,
      summary,
      footnote: "Our team will be in touch shortly to get you onboarded. If you have any questions, simply reply to this email.",
    });

    const result = await sendEmailViaResend({ to: recipient, subject, html, replyTo: FALLBACK_REPLY_TO });

    await logEmail(supabaseAdmin, {
      email_type: "payment_confirmation",
      recipient,
      subject,
      related_id: paymentId || null,
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? null : result.error,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error || "Failed to send email" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    console.error("send-payment-confirmation error:", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "An error occurred" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderEmail, sendEmailViaResend, logEmail, FALLBACK_REPLY_TO } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Internal-only: invoked by invite-admin with service-role key.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const recipient: string | undefined = body.recipient;
    const fullName: string | undefined = body.fullName;
    const tempPassword: string | undefined = body.tempPassword;
    const loginUrl: string = body.loginUrl || "https://sedge-pro.lovable.app/admin";
    const userId: string | undefined = body.userId;

    if (!recipient || !tempPassword) {
      return new Response(JSON.stringify({ error: "recipient and tempPassword are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const subject = "You've been invited to SEDGE Pro Admin";
    const summary = [
      { label: "Email", value: recipient },
      { label: "Temporary password", value: tempPassword },
    ];

    const html = renderEmail({
      preheader: "Your SEDGE Pro admin account is ready.",
      heading: "Welcome to SEDGE Pro Admin",
      intro: `Hi ${fullName || "there"},<br><br>You've been granted admin access to the <strong>SEDGE Pro</strong> platform. Use the credentials below to sign in. You'll be prompted to set a new password on first login.`,
      summary,
      ctaLabel: "Sign in to admin",
      ctaUrl: loginUrl,
      footnote: "For security, please do not share this email. If you weren't expecting this invitation, contact us immediately.",
    });

    const result = await sendEmailViaResend({ to: recipient, subject, html, replyTo: FALLBACK_REPLY_TO });

    await logEmail(supabaseAdmin, {
      email_type: "admin_invite",
      recipient,
      subject,
      related_id: userId || null,
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? null : result.error,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error || "Failed to send email" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    console.error("send-admin-invite-email error:", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "An error occurred" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

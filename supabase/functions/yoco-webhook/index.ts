import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Yoco webhook received:", JSON.stringify(body));

    const eventType = body.type; // e.g. "payment.succeeded", "payment.failed"
    const payload = body.payload;

    if (!payload) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutId = payload.metadata?.checkoutId;
    const paymentId = payload.id;
    const status = payload.status; // "succeeded" or "failed"

    if (!checkoutId) {
      console.log("No checkoutId in webhook payload, skipping");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Map Yoco status to our status
    let newStatus = "pending";
    if (eventType === "payment.succeeded" || status === "succeeded") {
      newStatus = "completed";
    } else if (eventType === "payment.failed" || status === "failed") {
      newStatus = "failed";
    }

    // Update payment record
    const { data: payment, error: updateError } = await supabaseAdmin
      .from("payments")
      .update({ status: newStatus, payment_id: paymentId, updated_at: new Date().toISOString() })
      .eq("checkout_id", checkoutId)
      .select("id, customer_email, package_name, amount_cents, metadata")
      .maybeSingle();

    if (updateError) {
      console.error("Error updating payment:", updateError);
    }

    // If payment succeeded, move lead to Won stage
    if (newStatus === "completed" && payment) {
      const customerEmail = payment.customer_email;
      const customerName = (payment.metadata as any)?.customerName;
      const customerPhone = (payment.metadata as any)?.customerPhone;
      const packageName = payment.package_name;
      const amount = payment.amount_cents;

      const { data: wonStage } = await supabaseAdmin
        .from("pipeline_stages")
        .select("id")
        .eq("name", "Purchase Completed")
        .maybeSingle();

      if (wonStage) {
        const WON_STAGE_ID = wonStage.id;

        let existingLead = null;
        if (customerEmail) {
          const { data: found } = await supabaseAdmin
            .from("leads")
            .select("id, stage_id")
            .eq("email", customerEmail)
            .limit(1)
            .maybeSingle();
          existingLead = found;
        }

        const { data: lastLead } = await supabaseAdmin
          .from("leads")
          .select("position")
          .eq("stage_id", WON_STAGE_ID)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextPosition = (lastLead?.position ?? -1) + 1;

        if (existingLead) {
          await supabaseAdmin.from("leads").update({
            stage_id: WON_STAGE_ID,
            position: nextPosition,
            package: packageName,
            source: "Website",
            notes: `Payment confirmed – ${packageName} (R${(amount / 100).toLocaleString()})`,
            phone: customerPhone || undefined,
            client_name: customerName || undefined,
          }).eq("id", existingLead.id);
        } else {
          await supabaseAdmin.from("leads").insert({
            client_name: customerName || customerEmail || "Unknown",
            email: customerEmail || null,
            phone: customerPhone || null,
            source: "Website",
            package: packageName,
            stage_id: WON_STAGE_ID,
            position: nextPosition,
            notes: `Payment confirmed – ${packageName} (R${(amount / 100).toLocaleString()})`,
          });
        }
      }
    }

    console.log(`Payment ${checkoutId} updated to ${newStatus}`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

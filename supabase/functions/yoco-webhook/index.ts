import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-signature",
};

async function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return signature === expectedSig;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    // MANDATORY signature verification — fail closed if secret missing
    const webhookSecret = Deno.env.get("YOCO_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("YOCO_WEBHOOK_SECRET is not configured — refusing to process webhook");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signature = req.headers.get("webhook-signature");
    const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody);
    console.log("Yoco webhook received:", JSON.stringify(body));

    const eventType = body.type;
    const payload = body.payload;

    if (!payload) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutId = payload.metadata?.checkoutId;
    const paymentId = payload.id;
    const status = payload.status;

    if (!checkoutId || typeof checkoutId !== "string") {
      console.log("No valid checkoutId in webhook payload, skipping");
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

    // Update invoice status based on payment result
    if (payment) {
      const invoiceId = (payment.metadata as any)?.invoiceId;
      if (invoiceId) {
        if (newStatus === "completed") {
          await supabaseAdmin
            .from("invoices")
            .update({ status: "paid", updated_at: new Date().toISOString() })
            .eq("id", invoiceId);
          console.log(`Invoice ${invoiceId} marked as paid`);
        } else if (newStatus === "failed") {
          await supabaseAdmin
            .from("invoices")
            .update({ status: "unconfirmed", updated_at: new Date().toISOString() })
            .eq("id", invoiceId);
          console.log(`Invoice ${invoiceId} marked as unconfirmed`);
        }
      }
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
  } catch (error: unknown) {
    console.error("Webhook error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

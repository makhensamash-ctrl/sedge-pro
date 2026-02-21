import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageName, amount, lineItems, customerName, customerEmail, customerPhone } = await req.json();

    const yocoKey = Deno.env.get("YOCO_SECRET_KEY");
    if (!yocoKey) {
      throw new Error("YOCO_SECRET_KEY not configured");
    }

    const origin = req.headers.get("origin") || "https://sedge-pro.lovable.app";

    const body: Record<string, unknown> = {
      amount,
      currency: "ZAR",
      successUrl: `${origin}/payment/success`,
      cancelUrl: `${origin}/payment/failed`,
      failureUrl: `${origin}/payment/failed`,
      metadata: { packageName, customerName, customerEmail, customerPhone },
    };

    if (lineItems) {
      body.lineItems = lineItems;
    }

    const response = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yocoKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Yoco error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store payment record with customer info
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabaseAdmin.from("payments").insert({
      checkout_id: data.id,
      package_name: packageName,
      amount_cents: amount,
      customer_email: customerEmail || null,
      status: "completed",
      metadata: { customerName, customerPhone },
    });

    // Create a lead in the "Won" pipeline stage
    const WON_STAGE_ID = "18e1a981-a58e-4185-bb0f-e192c78a8e9e";

    // Get next position in Won stage
    const { data: lastLead } = await supabaseAdmin
      .from("leads")
      .select("position")
      .eq("stage_id", WON_STAGE_ID)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastLead?.position ?? -1) + 1;

    await supabaseAdmin.from("leads").insert({
      client_name: customerName || customerEmail || "Unknown",
      email: customerEmail || null,
      phone: customerPhone || null,
      source: "Website",
      package: packageName,
      stage_id: WON_STAGE_ID,
      position: nextPosition,
      notes: `Payment completed – ${packageName} (R${(amount / 100).toLocaleString()})`,
    });

    return new Response(JSON.stringify({ redirectUrl: data.redirectUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
    const { packageName, amount, lineItems, customerName, customerEmail, customerPhone, heardAbout, businessName, regNumber, billingAddress } = await req.json();

    const yocoKey = Deno.env.get("Yoco_Secret");
    if (!yocoKey) {
      throw new Error("Yoco_Secret not configured");
    }

    const origin = req.headers.get("origin") || "https://sedge-pro.lovable.app";

    const body: Record<string, unknown> = {
      amount,
      currency: "ZAR",
      successUrl: `${origin}/payment/success`,
      cancelUrl: `${origin}/payment/failed`,
      failureUrl: `${origin}/payment/failed`,
      metadata: { packageName, customerName, customerEmail, customerPhone, heardAbout, businessName, regNumber, billingAddress },
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
      status: "created",
      metadata: { customerName, customerPhone, heardAbout, businessName, regNumber, billingAddress },
    });

    // Lead creation is now handled by the yoco-webhook function
    // after payment is confirmed by Yoco

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

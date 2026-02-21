import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageName, amount, lineItems } = await req.json();

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
      metadata: { packageName },
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

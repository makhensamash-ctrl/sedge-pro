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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Create or find client
    let clientId: string;
    const trimmedEmail = customerEmail?.trim();

    if (trimmedEmail) {
      const { data: existingClient } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("email", trimmedEmail)
        .limit(1)
        .single();

      if (existingClient) {
        clientId = existingClient.id;
        await supabaseAdmin.from("clients").update({
          name: customerName?.trim() || undefined,
          phone: customerPhone?.trim() || null,
          company: businessName?.trim() || null,
          address: billingAddress?.trim() || null,
        }).eq("id", clientId);
      } else {
        const { data: newClient, error: clientError } = await supabaseAdmin
          .from("clients")
          .insert({
            name: customerName?.trim() || trimmedEmail,
            email: trimmedEmail,
            phone: customerPhone?.trim() || null,
            company: businessName?.trim() || null,
            address: billingAddress?.trim() || null,
            notes: [
              regNumber ? `Reg: ${regNumber}` : null,
              heardAbout ? `Source: ${heardAbout}` : null,
            ].filter(Boolean).join("\n") || null,
          })
          .select("id")
          .single();

        if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);
        clientId = newClient.id;
      }
    } else {
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from("clients")
        .insert({
          name: customerName?.trim() || "Unknown",
          phone: customerPhone?.trim() || null,
          company: businessName?.trim() || null,
          address: billingAddress?.trim() || null,
        })
        .select("id")
        .single();

      if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);
      clientId = newClient.id;
    }

    // 2. Get default business profile
    const { data: businessProfile } = await supabaseAdmin
      .from("business_profiles")
      .select("id")
      .eq("is_default", true)
      .limit(1)
      .single();

    // 3. Generate invoice number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(Math.random() * 900 + 100);
    const invoiceNumber = `INV-${dateStr}-${rand}`;

    // 4. Calculate amounts (no VAT)
    const invoiceAmount = amount / 100; // Convert cents to rands
    const taxAmount = 0;
    const totalAmount = invoiceAmount;

    // Determine description from package name
    const description = packageName || "Card Payment";

    // 5. Create invoice (status: sent, will be updated by webhook)
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        client_id: clientId,
        business_profile_id: businessProfile?.id || null,
        amount: invoiceAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: "ZAR",
        status: "sent",
        issue_date: now.toISOString().slice(0, 10),
        due_date: dueDate.toISOString().slice(0, 10),
        description,
        notes: [
          `Payment method: Card`,
          regNumber ? `Registration: ${regNumber}` : null,
          heardAbout ? `Source: ${heardAbout}` : null,
        ].filter(Boolean).join("\n"),
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError) throw new Error(`Failed to create invoice: ${invoiceError.message}`);

    // 6. Create invoice line item
    await supabaseAdmin.from("invoice_line_items").insert({
      invoice_id: invoice.id,
      product_name: "SEDGE Pro — Pre-Launch Promotion",
      description,
      quantity: 1,
      unit_price: invoiceAmount,
      total_price: invoiceAmount,
      sort_order: 0,
    });

    // 7. Create Yoco checkout
    const origin = req.headers.get("origin") || "https://sedge-pro.lovable.app";

    const body: Record<string, unknown> = {
      amount,
      currency: "ZAR",
      successUrl: `${origin}/payment/success`,
      cancelUrl: `${origin}/payment/failed`,
      failureUrl: `${origin}/payment/failed`,
      metadata: { packageName, customerName, customerEmail, customerPhone, heardAbout, businessName, regNumber, billingAddress, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number },
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
      // Clean up invoice if Yoco fails
      await supabaseAdmin.from("invoice_line_items").delete().eq("invoice_id", invoice.id);
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      return new Response(JSON.stringify({ error: data }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Store payment record with invoice reference
    await supabaseAdmin.from("payments").insert({
      checkout_id: data.id,
      package_name: packageName,
      amount_cents: amount,
      customer_email: trimmedEmail || null,
      client_name: customerName?.trim() || null,
      status: "created",
      metadata: { customerName, customerPhone, heardAbout, businessName, regNumber, billingAddress, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number },
    });

    return new Response(JSON.stringify({ redirectUrl: data.redirectUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

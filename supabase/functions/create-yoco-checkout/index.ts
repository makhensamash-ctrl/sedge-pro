import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 10000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      packageName, 
      amount, 
      tierId, 
      promoCode, 
      lineItems, 
      customerName, 
      customerEmail, 
      customerPhone, 
      heardAbout, 
      businessName, 
      regNumber, 
      billingAddress, 
      paymentPlan 
    } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let basePriceCents = 0;
    let packageId = "";
    let billingCycle = "";
    let tierName = "";

    // 1. If tierId is provided, look up true price from database. Else fallback to client amount
    if (tierId) {
      const { data: tierData, error: tierError } = await supabaseAdmin
        .from("package_pricing_tiers")
        .select("price_cents, package_id, billing_cycle, name")
        .eq("id", tierId)
        .single();
        
      if (tierError || !tierData) {
        console.error("Tier fetch failed:", tierError);
        return new Response(JSON.stringify({ error: "Invalid pricing tier selection" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      basePriceCents = tierData.price_cents;
      packageId = tierData.package_id;
      billingCycle = tierData.billing_cycle;
      tierName = tierData.name;
    } else {
      // Legacy fallback
      basePriceCents = typeof amount === "number" ? amount : 0;
      billingCycle = paymentPlan || "";
    }

    // 2. Validate base price cents
    if (basePriceCents < 100 || basePriceCents > 100000000) {
      return new Response(JSON.stringify({ error: "Invalid payment amount configuration" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Resolve active promotions (either by code or auto-applied promotions)
    let finalPriceCents = basePriceCents;
    let appliedPromoId = null;
    let discountAppliedLabel = "";

    const promoQuery = supabaseAdmin
      .from("promotions")
      .select("*")
      .eq("is_active", true);

    const { data: promos, error: promoError } = await (promoCode 
      ? promoQuery.eq("code", promoCode.trim().toUpperCase()) 
      : promoQuery.is("code", null));

    if (!promoError && promos && promos.length > 0) {
      const now = new Date().toISOString();
      const validPromos = promos.filter((p: any) => {
        const startOk = p.start_date <= now;
        const endOk = !p.end_date || now <= p.end_date;
        const packageOk = !packageId || !p.applicable_package_ids || p.applicable_package_ids.includes(packageId);
        return startOk && endOk && packageOk;
      });

      if (validPromos.length > 0) {
        const activePromo = validPromos[0];
        appliedPromoId = activePromo.id;
        
        if (activePromo.discount_type === "percentage") {
          finalPriceCents = Math.round(basePriceCents * (1 - activePromo.discount_value / 100));
          discountAppliedLabel = `${activePromo.discount_value}% OFF via "${activePromo.name}"`;
        } else {
          finalPriceCents = Math.max(0, basePriceCents - activePromo.discount_value);
          discountAppliedLabel = `R${activePromo.discount_value / 100} OFF via "${activePromo.name}"`;
        }
      }
    }

    const isMonthlyPlan = billingCycle === "monthly" || paymentPlan === "monthly";

    if (customerEmail && typeof customerEmail === "string" && !EMAIL_REGEX.test(customerEmail.trim())) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const yocoKey = Deno.env.get("Yoco_Secret");
    if (!yocoKey) {
      console.error("Yoco_Secret not configured");
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
              regNumber ? `Reg: ${String(regNumber).slice(0, 50)}` : null,
              heardAbout ? `Source: ${String(heardAbout).slice(0, 100)}` : null,
            ].filter(Boolean).join("\n") || null,
          })
          .select("id")
          .single();

        if (clientError) {
          console.error("Client creation failed:", clientError);
          return new Response(JSON.stringify({ error: "Failed to process client details" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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

      if (clientError) {
        console.error("Client creation failed:", clientError);
        return new Response(JSON.stringify({ error: "Failed to process client details" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
    const invoiceAmount = finalPriceCents / 100;
    const taxAmount = 0;
    const totalAmount = invoiceAmount;
    
    let description = packageName ? String(packageName).slice(0, 200) : "Card Payment";
    if (tierName) {
      description = `${description} (${tierName})`;
    }
    const lineItemDescription = discountAppliedLabel ? `${description} (${discountAppliedLabel})` : description;

    // 5. Create invoice
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
        description: isMonthlyPlan ? `${description} (1 of 12)` : description,
        notes: [
          `Payment method: Card`,
          isMonthlyPlan ? `Recurring plan: 12 monthly instalments` : null,
          discountAppliedLabel ? `Applied Promotion: ${discountAppliedLabel}` : null,
          regNumber ? `Registration: ${String(regNumber).slice(0, 50)}` : null,
          heardAbout ? `Source: ${String(heardAbout).slice(0, 100)}` : null,
        ].filter(Boolean).join("\n"),
        is_recurring: isMonthlyPlan,
        recurrence_interval: isMonthlyPlan ? "monthly" : null,
        recurrence_count: 0,
        recurrence_max: isMonthlyPlan ? 11 : null,
        next_recurrence_date: isMonthlyPlan
          ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString().slice(0, 10)
          : null,
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError) {
      console.error("Invoice creation failed:", invoiceError);
      return new Response(JSON.stringify({ error: "Failed to create invoice" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Create invoice line item
    await supabaseAdmin.from("invoice_line_items").insert({
      invoice_id: invoice.id,
      product_name: "SEDGE Pro — Services & Invoicing",
      description: lineItemDescription,
      quantity: 1,
      unit_price: invoiceAmount,
      total_price: invoiceAmount,
      sort_order: 0,
    });

    // 7. Create Yoco checkout
    const origin = req.headers.get("origin") || "https://sedge-pro.lovable.app";

    const body: Record<string, unknown> = {
      amount: finalPriceCents,
      currency: "ZAR",
      successUrl: `${origin}/payment/success`,
      cancelUrl: `${origin}/payment/failed`,
      failureUrl: `${origin}/payment/failed`,
      metadata: { 
        packageName: lineItemDescription, 
        customerName, 
        customerEmail: trimmedEmail, 
        customerPhone, 
        invoiceId: invoice.id, 
        invoiceNumber: invoice.invoice_number,
        appliedPromoId
      },
    };

    if (lineItems) {
      if (!Array.isArray(lineItems) || lineItems.length === 0 || lineItems.length > 20) {
        return new Response(JSON.stringify({ error: "Invalid lineItems" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body.lineItems = lineItems.map((item: any) => ({
        displayName: String(item?.displayName ?? "Item").slice(0, 200),
        quantity: Math.max(1, Math.min(Number(item?.quantity) || 1, 999)),
        pricingDetails: {
          price: finalPriceCents,
          currency: "ZAR",
        },
      }));
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
      await supabaseAdmin.from("invoice_line_items").delete().eq("invoice_id", invoice.id);
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      return new Response(JSON.stringify({ error: "Payment gateway error" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Store payment record
    await supabaseAdmin.from("payments").insert({
      checkout_id: data.id,
      package_name: lineItemDescription,
      amount_cents: finalPriceCents,
      customer_email: trimmedEmail || null,
      client_name: customerName?.trim() || null,
      status: "created",
      metadata: { customerName, customerPhone, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, appliedPromoId },
    });

    return new Response(JSON.stringify({ redirectUrl: data.redirectUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Checkout error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

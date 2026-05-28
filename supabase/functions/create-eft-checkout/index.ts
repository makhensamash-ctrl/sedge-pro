import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 10000) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      packageName,
      tierId,
      promoCode,
      clientName,
      email,
      phone,
      businessName,
      regNumber,
      billingAddress,
      heardAbout,
      paymentPlan,
      planLabel,
      planPrice,
      amount: reqAmount,
    } = await req.json();

    // Validate required fields
    if (!clientName?.trim() || !email?.trim() || !businessName?.trim()) {
      return new Response(
        JSON.stringify({ error: "Name, email, and business name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate payment plan
    if (paymentPlan && !["once-off", "monthly"].includes(paymentPlan)) {
      return new Response(
        JSON.stringify({ error: "Invalid payment plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Create or find client
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email.trim())
      .limit(1)
      .single();

    let clientId: string;

    if (existingClient) {
      clientId = existingClient.id;
      await supabase.from("clients").update({
        name: clientName.trim(),
        phone: phone?.trim() || null,
        company: businessName?.trim() || null,
        address: billingAddress?.trim() || null,
      }).eq("id", clientId);
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: clientName.trim(),
          email: email.trim(),
          phone: phone?.trim() || null,
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
        return new Response(
          JSON.stringify({ error: "Failed to process client details" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      clientId = newClient.id;
    }

    // 2. Server-side pricing: Look up tier price and apply promotions (mirrors create-yoco-checkout)
    let amount: number;
    let description: string;
    let resolvedPackageName = packageName || "Pre-Launch Promotion";
    let discountAppliedLabel = "";

    if (tierId) {
      // Secure path: look up the real price from the database
      const { data: tierData, error: tierError } = await supabase
        .from("package_pricing_tiers")
        .select("price_cents, package_id, billing_cycle, name")
        .eq("id", tierId)
        .single();

      if (tierError || !tierData) {
        console.error("Tier fetch failed:", tierError);
        return new Response(
          JSON.stringify({ error: "Invalid pricing tier selection" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let basePriceCents = tierData.price_cents;
      let finalPriceCents = basePriceCents;

      // Apply promotions server-side
      const promoQuery = supabase
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
          const packageOk = !tierData.package_id || !p.applicable_package_ids || p.applicable_package_ids.includes(tierData.package_id);
          return startOk && endOk && packageOk;
        });

        if (validPromos.length > 0) {
          const activePromo = validPromos[0];
          if (activePromo.discount_type === "percentage") {
            finalPriceCents = Math.round(basePriceCents * (1 - activePromo.discount_value / 100));
            discountAppliedLabel = `${activePromo.discount_value}% OFF via "${activePromo.name}"`;
          } else {
            finalPriceCents = Math.max(0, basePriceCents - activePromo.discount_value);
            discountAppliedLabel = `R${activePromo.discount_value / 100} OFF via "${activePromo.name}"`;
          }
        }
      }

      // Convert cents to Rands
      amount = finalPriceCents / 100;

      // Resolve package name from DB if not provided by client
      if (!packageName && tierData.package_id) {
        const { data: pkgData } = await supabase
          .from("packages")
          .select("name")
          .eq("id", tierData.package_id)
          .single();
        if (pkgData) resolvedPackageName = pkgData.name;
      }

      const billingLabel = tierData.billing_cycle === "once_off" ? "Once-off Payment" : "Monthly Instalment (1 of 12)";
      description = `${resolvedPackageName} — ${billingLabel}`;
      if (discountAppliedLabel) {
        description += ` (${discountAppliedLabel})`;
      }
    } else {
      // Legacy fallback: use client-provided amount
      const parsedAmount = typeof reqAmount === "number" ? reqAmount : Number(reqAmount);
      if (reqAmount !== undefined && reqAmount !== null && !isNaN(parsedAmount) && parsedAmount >= 0) {
        amount = parsedAmount;
      } else if (paymentPlan === "once-off") {
        amount = 5000;
      } else {
        amount = 700;
      }

      if (paymentPlan === "once-off") {
        description = `${resolvedPackageName} — Once-off Payment`;
      } else {
        description = `${resolvedPackageName} — Monthly Instalment (1 of 12)`;
      }
    }

    // 3. Get default business profile
    const { data: businessProfile } = await supabase
      .from("business_profiles")
      .select("id, bank_name, account_number, branch_code, account_holder_name")
      .eq("is_default", true)
      .limit(1)
      .single();

    // 4. Generate invoice number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(Math.random() * 900 + 100);
    const invoiceNumber = `INV-${dateStr}-${rand}`;

    const taxAmount = 0;
    const totalAmount = amount;

    // 5. Create invoice
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        client_id: clientId,
        business_profile_id: businessProfile?.id || null,
        amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: "ZAR",
        status: "sent",
        issue_date: now.toISOString().slice(0, 10),
        due_date: dueDate.toISOString().slice(0, 10),
        description,
        notes: `Payment plan: ${String(planLabel || "").slice(0, 100)}\n${regNumber ? `Registration: ${String(regNumber).slice(0, 50)}\n` : ""}${heardAbout ? `Source: ${String(heardAbout).slice(0, 100)}` : ""}`.trim(),
        is_recurring: paymentPlan === "monthly",
        recurrence_interval: paymentPlan === "monthly" ? "monthly" : null,
        recurrence_count: 0,
        recurrence_max: paymentPlan === "monthly" ? 11 : null,
        next_recurrence_date: paymentPlan === "monthly"
          ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString().slice(0, 10)
          : null,
      })
      .select("id, invoice_number, total_amount")
      .single();

    if (invoiceError) {
      console.error("Invoice creation failed:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Failed to create invoice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Create invoice line item
    await supabase.from("invoice_line_items").insert({
      invoice_id: invoice.id,
      product_name: `SEDGE Pro — ${resolvedPackageName}`,
      description,
      quantity: 1,
      unit_price: amount,
      total_price: amount,
      sort_order: 0,
    });

    // 7. Create payment record with actual package name
    await supabase.from("payments").insert({
      package_name: resolvedPackageName,
      amount_cents: totalAmount * 100,
      currency: "ZAR",
      status: "pending",
      customer_email: email.trim(),
      client_name: clientName.trim(),
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        paymentMethod: "EFT",
        paymentPlan,
        ...(discountAppliedLabel ? { discount: discountAppliedLabel } : {}),
      },
    });

    // 8. Create lead with package name
    const { data: firstStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (firstStage) {
      const { data: maxPosData } = await supabase
        .from("leads")
        .select("position")
        .eq("stage_id", firstStage.id)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      const nextPosition = (maxPosData?.position ?? -1) + 1;

      await supabase.from("leads").insert({
        client_name: clientName.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        source: resolvedPackageName,
        package: resolvedPackageName,
        notes: `Payment: EFT\nPlan: ${String(planLabel || "").slice(0, 100)} (${String(planPrice || "").slice(0, 50)})\nBusiness: ${String(businessName).slice(0, 100)}\n${regNumber ? `Reg: ${String(regNumber).slice(0, 50)}\n` : ""}Invoice: ${invoiceNumber}${discountAppliedLabel ? `\nDiscount: ${discountAppliedLabel}` : ""}`,
        stage_id: firstStage.id,
        position: nextPosition,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoiceNumber: invoice.invoice_number,
        totalAmount,
        bankDetails: businessProfile
          ? {
              bankName: businessProfile.bank_name,
              accountNumber: businessProfile.account_number,
              branchCode: businessProfile.branch_code,
              accountHolder: businessProfile.account_holder_name,
              reference: invoice.invoice_number,
            }
          : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("EFT checkout error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

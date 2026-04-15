import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate using CRON_SECRET or valid admin JWT
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (cronSecret) {
    const token = authHeader?.replace("Bearer ", "");
    if (token !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    // Fallback: require a valid admin JWT if no CRON_SECRET
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Verify admin role
    const supabaseCheck = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: role } = await supabaseCheck
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    const { data: dueInvoices, error: fetchError } = await supabase
      .from("invoices")
      .select("*, invoice_line_items(*)")
      .eq("is_recurring", true)
      .lte("next_recurrence_date", today)
      .not("next_recurrence_date", "is", null);

    if (fetchError) throw fetchError;
    if (!dueInvoices || dueInvoices.length === 0) {
      return new Response(JSON.stringify({ message: "No recurring invoices due", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;

    for (const invoice of dueInvoices) {
      const now = new Date();
      const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

      const currentNext = new Date(invoice.next_recurrence_date);
      let nextDate: Date;
      if (invoice.recurrence_interval === "weekly") {
        nextDate = new Date(currentNext);
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (invoice.recurrence_interval === "yearly") {
        nextDate = new Date(currentNext);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate = new Date(currentNext);
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const { data: newInvoice, error: insertError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          client_id: invoice.client_id,
          business_profile_id: invoice.business_profile_id,
          amount: invoice.amount,
          tax_amount: invoice.tax_amount,
          total_amount: invoice.total_amount,
          due_date: invoice.due_date,
          status: "draft",
          created_by: invoice.created_by,
          is_recurring: false,
          recurring_parent_id: invoice.id,
          currency: invoice.currency,
          description: invoice.description,
          notes: invoice.notes,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Failed to create invoice from ${invoice.id}:`, insertError);
        continue;
      }

      if (invoice.invoice_line_items && invoice.invoice_line_items.length > 0) {
        const lineItems = invoice.invoice_line_items.map((item: any) => ({
          invoice_id: newInvoice.id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sort_order: item.sort_order,
        }));
        await supabase.from("invoice_line_items").insert(lineItems);
      }

      const { data: clientData } = await supabase
        .from("clients")
        .select("name, email")
        .eq("id", invoice.client_id)
        .single();

      await supabase.from("payments").insert({
        package_name: `Invoice ${invoiceNumber}`,
        amount_cents: Math.round(invoice.total_amount * 100),
        client_name: clientData?.name || "",
        customer_email: clientData?.email || null,
        status: "pending",
        metadata: { invoice_id: newInvoice.id, source: "recurring_invoice" },
      });

      await supabase
        .from("invoices")
        .update({ next_recurrence_date: nextDate.toISOString().split("T")[0] })
        .eq("id", invoice.id);

      generated++;
    }

    return new Response(
      JSON.stringify({ message: `Generated ${generated} recurring invoices`, generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating recurring invoices:", error);
    return new Response(JSON.stringify({ error: "Failed to generate recurring invoices" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

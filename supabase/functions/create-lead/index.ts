import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_name, email, phone, source, notes } = await req.json();

    if (!client_name || typeof client_name !== "string" || client_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "client_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the first pipeline stage (lowest position) as default
    const { data: firstStage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (stageError || !firstStage) {
      return new Response(JSON.stringify({ error: "No pipeline stages configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get max position in that stage
    const { data: maxPosData } = await supabase
      .from("leads")
      .select("position")
      .eq("stage_id", firstStage.id)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPosData?.position ?? -1) + 1;

    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        client_name: client_name.trim().slice(0, 100),
        email: email?.trim().slice(0, 255) || null,
        phone: phone?.trim().slice(0, 20) || null,
        source: source?.trim().slice(0, 100) || null,
        notes: notes?.trim().slice(0, 1000) || null,
        stage_id: firstStage.id,
        position: nextPosition,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, lead }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

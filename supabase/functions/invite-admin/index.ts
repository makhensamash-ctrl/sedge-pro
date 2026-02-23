import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!callerRole) throw new Error("Only super admins can perform this action");

    const { action, email, password, fullName, userId } = await req.json();

    if (action === "update-password") {
      if (!userId || !password) throw new Error("User ID and password are required");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset-all-passwords") {
      const defaultPwd = Deno.env.get("DEFAULT_ADMIN_PASSWORD") || "ChangeMe123!";

      // Get all admin/super_admin user IDs
      const { data: allRoles } = await supabaseAdmin.from("user_roles").select("user_id, role");
      if (!allRoles || allRoles.length === 0) {
        return new Response(JSON.stringify({ success: true, updated: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updated = 0;
      const errors: string[] = [];
      for (const role of allRoles) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(role.user_id, {
            password: defaultPwd,
            user_metadata: { must_change_password: true },
          });
          updated++;
        } catch (e) {
          errors.push(`${role.user_id}: ${e.message}`);
        }
      }

      return new Response(JSON.stringify({ success: true, updated, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: create admin
    if (!email) throw new Error("Email is required");

    const defaultPassword = password || Deno.env.get("DEFAULT_ADMIN_PASSWORD") || "ChangeMe123!";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let targetUserId: string;

    if (existingUser) {
      targetUserId = existingUser.id;
      // Update metadata if needed
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: { full_name: fullName || existingUser.user_metadata?.full_name || "" },
      });
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName || "", must_change_password: true },
      });
      if (createError) throw createError;
      targetUserId = newUser.user.id;
    }

    // Upsert role (avoid duplicate error)
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: targetUserId, role: "admin" });
      if (roleError) throw roleError;
    }

    return new Response(JSON.stringify({ success: true, userId: targetUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

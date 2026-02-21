import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  role: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        setState({ user, role: data?.role ?? null, loading: false });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        setState({ user, role: data?.role ?? null, loading: false });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut, isSuperAdmin: state.role === "super_admin", isAdmin: state.role === "super_admin" || state.role === "admin" };
}

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
    let mounted = true;

    const fetchRole = (userId: string) => {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (mounted) {
            setState((prev) => ({ ...prev, role: data?.role ?? null, loading: false }));
          }
        });
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setState((prev) => ({ ...prev, user }));
      if (user) {
        fetchRole(user.id);
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    // Listen for auth changes — never await inside this callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setState((prev) => ({ ...prev, user }));
      if (user) {
        // Use setTimeout to avoid deadlock
        setTimeout(() => fetchRole(user.id), 0);
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut, isSuperAdmin: state.role === "super_admin", isAdmin: state.role === "super_admin" || state.role === "admin" };
}

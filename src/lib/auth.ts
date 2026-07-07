import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
    };

    void loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    const loadAdminStatus = async () => {
      // Prefer the has_role RPC (SECURITY DEFINER, RLS-proof).
      const rpc = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      let admin = !!rpc.data;
      if (rpc.error) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        admin = !!data?.some((r) => r.role === "admin");
      }
      if (!mounted) return;
      setIsAdmin(admin);
      setLoading(false);
    };

    void loadAdminStatus();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  return { session, user: session?.user ?? null, isAdmin, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}

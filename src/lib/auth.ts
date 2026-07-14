import { useEffect, useRef, useState } from "react";
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
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Prime from current session synchronously (no admin fetch here — the
    // second effect owns that and clears `loading`).
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Only surface session changes; do NOT toggle loading on every
      // TOKEN_REFRESHED/INITIAL_SESSION event or the page can hang on
      // "Loading…" forever when the user id is unchanged.
      setSession((prev) => (prev?.user?.id === s?.user?.id && prev?.access_token === s?.access_token ? prev : s));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (uid === lastUserIdRef.current) return; // unchanged — skip refetch
    lastUserIdRef.current = uid;

    if (!uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    supabase
      .rpc("has_role", { _user_id: uid, _role: "admin" })
      .then(async ({ data, error }) => {
        let admin = !!data;
        if (error) {
          const { data: rows } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", uid);
          admin = !!rows?.some((r) => r.role === "admin");
        }
        if (!mounted) return;
        setIsAdmin(admin);
        setLoading(false);
      });

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

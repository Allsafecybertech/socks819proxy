import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { ShieldPlus, ShieldMinus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const { data: credits } = await supabase.from("credit_balances").select("user_id, balance");
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    const cMap = new Map((credits ?? []).map((c: any) => [c.user_id, c.balance]));
    setRows(
      (profiles ?? []).map((p: any) => ({
        ...p,
        roles: roleMap.get(p.id) ?? ["user"],
        isAdmin: (roleMap.get(p.id) ?? []).includes("admin"),
        credits: cMap.get(p.id) ?? 0,
      })),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function grant(target: string) {
    setBusy(target);
    const { error } = await supabase.rpc("grant_admin", { _email: target });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${target} is now an admin`);
    setEmail("");
    void load();
  }
  async function revoke(target: string) {
    if (!confirm(`Revoke admin from ${target}?`)) return;
    setBusy(target);
    const { error } = await supabase.rpc("revoke_admin", { _email: target });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Admin revoked from ${target}`);
    void load();
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Manage accounts and administrator roles." />

      <div className="glass-card rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1">
          <div className="text-sm font-semibold">Promote user to admin</div>
          <div className="text-xs text-muted-foreground">Grants full admin access to the account with this email.</div>
        </div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm"
        />
        <Button disabled={!email || busy === email} onClick={() => grant(email.trim())}>
          <ShieldPlus className="w-4 h-4 mr-1.5" /> Grant admin
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>{["Email","Username","Role","Credits","Joined",""].map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">{r.username ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {r.roles.map((role: string) => (
                        <Pill key={role} className={role === "admin" ? "border-accent/40 text-accent bg-accent/10" : "border-border"}>{role}</Pill>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.credits}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.isAdmin ? (
                      <Button size="sm" variant="ghost" disabled={busy === r.email} onClick={() => revoke(r.email)}>
                        <ShieldMinus className="w-3.5 h-3.5 mr-1" />Revoke
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={busy === r.email} onClick={() => grant(r.email)}>
                        <ShieldPlus className="w-3.5 h-3.5 mr-1" />Promote
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

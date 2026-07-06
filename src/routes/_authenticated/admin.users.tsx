import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill } from "@/components/ui-kit";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: credits } = await supabase.from("credit_balances").select("user_id, balance");
      const rMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
      const cMap = new Map((credits ?? []).map((c: any) => [c.user_id, c.balance]));
      setRows((profiles ?? []).map((p: any) => ({ ...p, role: rMap.get(p.id) ?? "user", credits: cMap.get(p.id) ?? 0 })));
    })();
  }, []);
  return (
    <>
      <PageHeader title="Users" subtitle="All registered accounts." />
      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>{["Email","Username","Role","Credits","Joined"].map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">{r.username ?? "—"}</td>
                <td className="px-4 py-3"><Pill className={r.role === "admin" ? "border-accent/40 text-accent bg-accent/10" : "border-border"}>{r.role}</Pill></td>
                <td className="px-4 py-3">{r.credits}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

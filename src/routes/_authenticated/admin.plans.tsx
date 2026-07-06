import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fmtUsd } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({ meta: [{ title: "Plans — Admin" }] }),
  component: PlansPage,
});

function PlansPage() {
  const [rows, setRows] = useState<any[]>([]);
  async function load() { const { data } = await supabase.from("plans").select("*").order("sort_order"); setRows(data ?? []); }
  useEffect(() => { load(); }, []);
  async function toggle(p: any) {
    const { error } = await supabase.from("plans").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  }
  return (
    <>
      <PageHeader title="Plans" subtitle="Toggle plans on and off." />
      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>{["Name","Type","Price","Duration","Reveals","Credits","Active"].map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border/50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3"><Pill className="border-border capitalize">{p.plan_type}</Pill></td>
                <td className="px-4 py-3">{fmtUsd(p.price_usd)}</td>
                <td className="px-4 py-3">{p.duration_days ? `${p.duration_days}d` : "—"}</td>
                <td className="px-4 py-3">{p.unlimited ? "∞" : (p.max_reveals ?? "—")}</td>
                <td className="px-4 py-3">{p.credits ?? "—"}</td>
                <td className="px-4 py-3"><Switch checked={p.is_active} onCheckedChange={() => toggle(p)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

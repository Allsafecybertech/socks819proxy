import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { DollarSign, Users, ClipboardCheck, Boxes, Activity, Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — NOVAIN SOCKS" }] }),
  component: AdminDash,
});

function AdminDash() {
  const [s, setS] = useState<any>({});
  useEffect(() => {
    (async () => {
      const [rev, users, pending, inv, activePlans, today] = await Promise.all([
        supabase.from("orders").select("amount_usd").eq("status", "verified"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("inventory").select("id", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      ]);
      setS({
        revenue: (rev.data ?? []).reduce((a: number, r: any) => a + Number(r.amount_usd), 0),
        users: users.count ?? 0, pending: pending.count ?? 0, inv: inv.count ?? 0,
        active: activePlans.count ?? 0, today: today.count ?? 0,
      });
    })();
  }, []);
  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Business-wide statistics." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Revenue (verified)" value={`$${(s.revenue ?? 0).toLocaleString()}`} icon={DollarSign} accent />
        <StatCard label="Active Users" value={s.users} icon={Users} />
        <StatCard label="Pending Payments" value={s.pending} icon={ClipboardCheck} />
        <StatCard label="Available Inventory" value={s.inv} icon={Boxes} />
        <StatCard label="Active Subscriptions" value={s.active} icon={Activity} />
        <StatCard label="Orders Today" value={s.today} icon={Receipt} />
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-kit";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/statistics")({
  head: () => ({ meta: [{ title: "Statistics — Admin" }] }),
  component: Stats,
});

function Stats() {
  const [rev, setRev] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("orders").select("amount_usd, created_at, status").eq("status", "verified").then(({ data }) => {
      const b: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); b[d.toISOString().slice(5,10)] = 0; }
      (data ?? []).forEach((o: any) => {
        const k = o.created_at.slice(5, 10);
        if (b[k] !== undefined) b[k] += Number(o.amount_usd);
      });
      setRev(Object.entries(b).map(([day, revenue]) => ({ day, revenue })));
    });
  }, []);
  return (
    <>
      <PageHeader title="Statistics" subtitle="Revenue trends across the last 30 days." />
      <div className="glass-card rounded-2xl p-5 h-96">
        <ResponsiveContainer>
          <BarChart data={rev}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.03 265 / 0.3)" />
            <XAxis dataKey="day" stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} />
            <YAxis stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "oklch(0.20 0.035 265)", border: "1px solid oklch(0.32 0.04 265)", borderRadius: 8 }} />
            <Bar dataKey="revenue" fill="oklch(0.68 0.19 265)" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

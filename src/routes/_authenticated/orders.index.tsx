import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill, EmptyState } from "@/components/ui-kit";
import { fmtUsd, fmtDate, statusColor } from "@/lib/format";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({ meta: [{ title: "Order History — NOVAIN SOCKS" }] }),
  component: OrdersPage,
});

const PAGE_SIZE = 20;

function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    supabase.from("orders").select("*, plans(name, plan_type, duration_days, credits)").order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, []);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const rows = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function planInfo(o: any) {
    const p = o.plans;
    if (!p) return "—";
    if (p.plan_type === "credit") return `CREDIT - ${p.credits ?? 0} | EXP - 0`;
    if (p.plan_type === "lifetime") return `LIFETIME - ${p.name}`;
    const label = (p.name || "").toUpperCase();
    return `${label} | EXP - ${p.duration_days ?? 0} DAYS`;
  }

  return (
    <>
      <PageHeader title="Order History" subtitle="Every purchase, payment method and plan you've activated." />
      {orders.length === 0 ? (
        <EmptyState icon={Receipt} title="No orders yet" subtitle="Pick a plan to get started." />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <div className="text-sm font-semibold">Order History</div>
            <div className="text-xs text-muted-foreground">{orders.length.toLocaleString()} orders</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <tr>{["ID", "Batch", "Time Paid", "Amount", "Account Payment", "Info Payment", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-t border-border/40 hover:bg-primary/5 transition">
                    <td className="px-3 py-2.5 font-mono text-xs">{o.order_number?.slice(-6) ?? o.id.slice(0, 6)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{o.order_number?.slice(0, 3) ?? "—"}****</td>
                    <td className="px-3 py-2.5 text-xs">{fmtDate(o.paid_at ?? o.created_at)}</td>
                    <td className="px-3 py-2.5 font-semibold">{fmtUsd(o.amount_usd).replace("$", "")}</td>
                    <td className="px-3 py-2.5"><Pill className="border-primary/40 text-primary bg-primary/10">{(o.currency ?? "").split("_")[0]}</Pill></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{planInfo(o)}</td>
                    <td className="px-3 py-2.5"><Pill className={statusColor(o.status)}>{o.status.replace("_", " ")}</Pill></td>
                    <td className="px-3 py-2.5"><Link to="/orders/$id" params={{ id: o.id }} className="text-primary hover:underline text-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 py-4 border-t border-border/40">
              <button className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-2" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
              {Array.from({ length: totalPages }).slice(0, 8).map((_, i) => {
                const n = i + 1;
                return (
                  <button key={n} onClick={() => setPage(n)}
                    className={`h-8 w-8 rounded-md text-sm ${page === n ? "gradient-primary text-primary-foreground font-semibold" : "hover:bg-muted/40"}`}>
                    {n}
                  </button>
                );
              })}
              <button className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-2" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

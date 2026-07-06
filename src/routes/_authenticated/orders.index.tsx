import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill, EmptyState } from "@/components/ui-kit";
import { fmtUsd, fmtDate, statusColor, CRYPTO_LABELS } from "@/lib/format";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({ meta: [{ title: "Orders — NOVAIN SOCKS" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("orders").select("*, plans(name, plan_type)").order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, []);

  return (
    <>
      <PageHeader title="Orders" subtitle="Track your purchases and payment status." />
      {orders.length === 0 ? (
        <EmptyState icon={Receipt} title="No orders yet" subtitle="Pick a plan to get started." />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>{["Order", "Plan", "Amount", "Currency", "Status", "Created", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                  <td className="px-4 py-3">{o.plans?.name ?? "—"}</td>
                  <td className="px-4 py-3">{fmtUsd(o.amount_usd)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{CRYPTO_LABELS[o.currency] ?? o.currency}</td>
                  <td className="px-4 py-3"><Pill className={statusColor(o.status)}>{o.status.replace("_"," ")}</Pill></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3"><Link to="/orders/$id" params={{ id: o.id }} className="text-primary hover:underline text-sm">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

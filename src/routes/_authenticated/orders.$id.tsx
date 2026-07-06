import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtUsd, statusColor, CRYPTO_LABELS } from "@/lib/format";
import { Copy, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({ meta: [{ title: "Payment — NOVAIN SOCKS" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = useParams({ from: "/_authenticated/orders/$id" });
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [txHash, setTxHash] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("orders").select("*, plans(*)").eq("id", id).maybeSingle();
    setOrder(data);
  }
  useEffect(() => { load(); }, [id]);

  async function submit() {
    if (!order || !user) return;
    if (!txHash) return toast.error("Transaction hash required");
    setBusy(true);
    let screenshotUrl: string | null = null;
    if (file) {
      const path = `${user.id}/${order.id}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("screenshots").upload(path, file);
      if (error) { toast.error(error.message); setBusy(false); return; }
      screenshotUrl = path;
    }
    const { error } = await supabase.from("orders").update({
      tx_hash: txHash, screenshot_url: screenshotUrl,
      status: "submitted", submitted_at: new Date().toISOString(),
    }).eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted — awaiting admin verification");
    load();
  }

  if (!order) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <>
      <PageHeader title="Complete Payment" subtitle={`Order ${order.order_number}`} right={<Pill className={statusColor(order.status)}>{order.status.replace("_"," ")}</Pill>} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Plan</div>
            <div className="font-semibold">{order.plans?.name}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Amount</div>
            <div className="text-3xl font-bold text-gradient">{fmtUsd(order.amount_usd)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Currency</div>
            <div>{CRYPTO_LABELS[order.currency] ?? order.currency}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Send to wallet</div>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 p-3">
              <code className="text-xs break-all flex-1">{order.wallet_address || "Wallet not configured — contact support"}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(order.wallet_address); toast.success("Copied"); }}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Send the exact amount. Payments confirmed on-chain will be reviewed by an admin.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="font-semibold">Submit payment proof</div>
          {order.status === "pending_payment" ? (
            <>
              <div>
                <Label>Transaction hash</Label>
                <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x… / txid" />
              </div>
              <div>
                <Label>Payment screenshot (optional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button className="w-full gradient-primary" onClick={submit} disabled={busy}>
                <Upload className="w-4 h-4 mr-2" />{busy ? "Submitting…" : "Submit for verification"}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-sm">Status: <Pill className={statusColor(order.status)}>{order.status.replace("_"," ")}</Pill></div>
              {order.tx_hash && <div className="text-xs"><span className="text-muted-foreground">TX Hash:</span> <code className="break-all">{order.tx_hash}</code></div>}
              {order.admin_notes && <div className="text-xs"><span className="text-muted-foreground">Admin note:</span> {order.admin_notes}</div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

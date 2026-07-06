import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtUsd, fmtDate, statusColor, CRYPTO_LABELS } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ExternalLink, CheckCircle2, XCircle, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "Payment Verification — Admin" }] }),
  component: AdminOrders,
});

function AdminOrders() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("submitted");
  const [review, setReview] = useState<any | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    const { data } = await supabase.from("orders").select("*, plans(name, plan_type), profiles!orders_user_id_fkey(email, username)")
      .eq("status", status as any).order("submitted_at", { ascending: true, nullsFirst: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [status]);

  async function openReview(o: any) {
    setReview(o); setReason("");
    if (o.screenshot_url) {
      const { data } = await supabase.storage.from("screenshots").createSignedUrl(o.screenshot_url, 3600);
      setScreenshotUrl(data?.signedUrl ?? null);
    } else setScreenshotUrl(null);
  }

  async function approve() {
    const { error } = await supabase.rpc("activate_order", { _order_id: review.id });
    if (error) return toast.error(error.message);
    toast.success("Order approved"); setReview(null); load();
  }
  async function reject() {
    const { error } = await supabase.rpc("reject_order", { _order_id: review.id, _reason: reason || "Payment could not be verified." });
    if (error) return toast.error(error.message);
    toast.success("Order rejected"); setReview(null); load();
  }

  const chainLink = (o: any) => {
    if (!o.tx_hash) return null;
    if (o.currency === "BTC") return `https://blockchair.com/bitcoin/transaction/${o.tx_hash}`;
    if (o.currency === "LTC") return `https://blockchair.com/litecoin/transaction/${o.tx_hash}`;
    if (o.currency === "USDT_TRC20") return `https://tronscan.org/#/transaction/${o.tx_hash}`;
    return `https://etherscan.io/tx/${o.tx_hash}`;
  };

  return (
    <>
      <PageHeader title="Payment Verification" subtitle="Review submitted payments and activate subscriptions." right={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="pending_payment">Pending</SelectItem>
          </SelectContent>
        </Select>
      } />

      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>{["Order","User","Plan","Amount","Currency","Submitted","Status",""].map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-border/50">
                <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                <td className="px-4 py-3 text-xs">{o.profiles?.email ?? "—"}</td>
                <td className="px-4 py-3">{o.plans?.name}</td>
                <td className="px-4 py-3">{fmtUsd(o.amount_usd)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{CRYPTO_LABELS[o.currency] ?? o.currency}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(o.submitted_at)}</td>
                <td className="px-4 py-3"><Pill className={statusColor(o.status)}>{o.status.replace("_"," ")}</Pill></td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => openReview(o)}><Search className="w-3.5 h-3.5 mr-1.5" />Review</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground text-sm">Nothing to review</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Review Order {review?.order_number}</DialogTitle></DialogHeader>
          {review && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <Row k="User" v={review.profiles?.email} />
                <Row k="Plan" v={review.plans?.name} />
                <Row k="Amount" v={fmtUsd(review.amount_usd)} />
                <Row k="Currency" v={CRYPTO_LABELS[review.currency]} />
                <Row k="Wallet" v={<code className="text-[10px] break-all">{review.wallet_address}</code>} />
                <Row k="TX Hash" v={review.tx_hash ? (
                  <a href={chainLink(review)!} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs break-all">
                    {review.tx_hash} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : "—"} />
                <Row k="Submitted" v={fmtDate(review.submitted_at)} />
                <div className="pt-3">
                  <div className="text-xs text-muted-foreground mb-1">Rejection reason (optional)</div>
                  <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/40 min-h-[220px] flex items-center justify-center overflow-hidden">
                {screenshotUrl ? <img src={screenshotUrl} alt="proof" className="w-full h-auto" /> : <span className="text-xs text-muted-foreground">No screenshot uploaded</span>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={reject}><XCircle className="w-4 h-4 mr-2 text-destructive" />Reject</Button>
            <Button className="gradient-primary" onClick={approve}><CheckCircle2 className="w-4 h-4 mr-2" />Approve & Activate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (<div className="flex gap-3"><div className="w-24 text-xs text-muted-foreground uppercase tracking-wider">{k}</div><div className="flex-1">{v ?? "—"}</div></div>);
}

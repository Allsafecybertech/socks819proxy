import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fmtUsd, CRYPTO_LABELS, CRYPTO_LIST } from "@/lib/format";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function PlanGrid({ type }: { type: "time" | "credit" | "lifetime" }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [buying, setBuying] = useState<any | null>(null);
  const [currency, setCurrency] = useState<string>("USDT_TRC20");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("plans").select("*").eq("plan_type", type).eq("is_active", true).order("sort_order")
      .then(({ data }) => setPlans(data ?? []));
  }, [type]);

  async function checkout() {
    if (!buying || !user) return;
    setBusy(true);
    const { data: setting } = await supabase.from("system_settings").select("value").eq("key", `wallet.${currency}`).maybeSingle();
    const wallet = (setting?.value as string) || "wallet-not-configured";
    const { data, error } = await supabase.from("orders").insert({
      user_id: user.id, plan_id: buying.id,
      currency: currency as any, wallet_address: wallet,
      amount_usd: buying.price_usd,
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Order created — complete payment");
    nav({ to: "/orders/$id", params: { id: data.id } });
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.id} className="glass-card rounded-2xl p-6 relative overflow-hidden hover:border-primary/40 transition group">
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition" />
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{type}</div>
              <div className="text-2xl font-bold mt-1">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gradient">{fmtUsd(p.price_usd)}</span>
                {type === "time" && <span className="text-xs text-muted-foreground">/ {p.duration_days}d</span>}
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.duration_days && <Feat text={`${p.duration_days} days access`} />}
                {p.max_reveals && <Feat text={`${p.max_reveals.toLocaleString()} reveals included`} />}
                {p.credits && <Feat text={`${p.credits} reveal credits`} />}
                {p.credits && <Feat text="Credits never expire" />}
                {p.unlimited && <Feat text="Unlimited reveals" />}
                {type === "lifetime" && <Feat text="Never expires" />}
                <Feat text="Instant activation on approval" />
              </ul>
              <Button className="w-full mt-6 gradient-primary" onClick={() => setBuying(p)}>Get Plan</Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!buying} onOpenChange={(o) => !o && setBuying(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Checkout — {buying?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Amount due</div>
            <div className="text-3xl font-bold text-gradient">{fmtUsd(buying?.price_usd)}</div>
            <div>
              <div className="text-sm font-medium mb-1.5">Pay with</div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRYPTO_LIST.map((c) => <SelectItem key={c} value={c}>{CRYPTO_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuying(null)}>Cancel</Button>
            <Button className="gradient-primary" onClick={checkout} disabled={busy}>{busy ? "Creating…" : "Create Order"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Feat({ text }: { text: string }) {
  return <li className="flex gap-2 items-start"><Check className="w-4 h-4 mt-0.5 text-success" /><span>{text}</span></li>;
}

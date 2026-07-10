import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fmtUsd, CRYPTO_LABELS, CRYPTO_LIST } from "@/lib/format";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Zap, Calendar, CalendarCheck, CalendarDays, Medal, Trophy, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * PlanGrid — reference-style colorful plan cards.
 * - type="time" → 1 Day / 15 Days / 30 Days / 365 Days (icon+badge header, "N socks $X")
 * - type="credit" → Starter / Standard / Premium (multiple credit tiers per card)
 * - type="lifetime" → Standard grid
 */
export function PlanGrid({ type }: { type: "time" | "credit" | "lifetime" }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [buying, setBuying] = useState<any | null>(null);
  const [currency, setCurrency] = useState<string>("USDT_TRC20");
  const [busy, setBusy] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [filterCountry, setFilterCountry] = useState<string>("any");
  const [filterKind, setFilterKind] = useState<string>("any");

  useEffect(() => {
    supabase.from("plans").select("*").eq("plan_type", type).eq("is_active", true).order("sort_order")
      .then(({ data }) => setPlans(data ?? []));
  }, [type]);

  // Preload distinct countries/kinds from available inventory so users pick
  // filters at checkout — used to auto-assign matching proxies on approval.
  useEffect(() => {
    supabase.from("inventory").select("country,proxy_kind").eq("status", "available").limit(2000)
      .then(({ data }) => {
        setCountries(Array.from(new Set((data ?? []).map((r: any) => r.country).filter(Boolean))).sort() as string[]);
        setKinds(Array.from(new Set((data ?? []).map((r: any) => r.proxy_kind).filter(Boolean))).sort() as string[]);
      });
  }, []);

  async function checkout() {
    if (!buying || !user) return;
    setBusy(true);
    const { data: setting } = await supabase.from("system_settings").select("value").eq("key", `wallet.${currency}`).maybeSingle();
    const wallet = (setting?.value as string) || "wallet-not-configured";
    const filters: Record<string, string> = {};
    if (filterCountry !== "any") filters.country = filterCountry;
    if (filterKind !== "any") filters.proxy_kind = filterKind;
    const { data, error } = await supabase.from("orders").insert({
      user_id: user.id, plan_id: buying.id,
      currency: currency as any, wallet_address: wallet,
      amount_usd: buying.price_usd,
      filters,
    } as any).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Order created — complete payment");
    nav({ to: "/orders/$id", params: { id: data.id } });
  }

  if (type === "credit") return <CreditGrid plans={plans} onBuy={setBuying} dialog={dialog()} />;
  if (type === "time") return <TimeGrid plans={plans} onBuy={setBuying} dialog={dialog()} />;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.id} className="glass-card rounded-2xl p-6 hover:border-primary/40 transition">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Lifetime</div>
            <div className="text-2xl font-bold mt-1">{p.name}</div>
            <div className="text-3xl font-bold text-gradient mt-4">{fmtUsd(p.price_usd)}</div>
            <Button className="w-full mt-5 gradient-primary" onClick={() => setBuying(p)}>Get Plan</Button>
          </div>
        ))}
      </div>
      {dialog()}
    </>
  );

  function dialog() {
    const quota = buying?.plan_type === "credit" ? buying?.credits : (buying?.max_reveals ?? buying?.fair_use_limit ?? 1);
    return (
      <Dialog open={!!buying} onOpenChange={(o) => !o && setBuying(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Checkout — {buying?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Amount due</div>
            <div className="text-3xl font-bold text-gradient">{fmtUsd(buying?.price_usd)}</div>

            <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
              On payment approval, <span className="text-foreground font-semibold">{quota}</span> proxies matching your filters will be assigned to your account automatically.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs font-medium mb-1">Country</div>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="any">Any</SelectItem>
                    {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs font-medium mb-1">Type</div>
                <Select value={filterKind} onValueChange={setFilterKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {kinds.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
    );
  }
}

/* ---------------- TIME (Daily) plans ---------------- */
function TimeGrid({ plans, onBuy, dialog }: { plans: any[]; onBuy: (p: any) => void; dialog: React.ReactNode }) {
  const styles: Record<number, { bg: string; badgeBg: string; badgeText: string; label: string; icon: any }> = {
    1: { bg: "from-purple-600 to-fuchsia-700", badgeBg: "bg-fuchsia-400/30", badgeText: "text-fuchsia-100", label: "TEST", icon: Zap },
    15: { bg: "from-sky-500 to-blue-600", badgeBg: "bg-pink-400/30", badgeText: "text-pink-100", label: "CHEAP", icon: Calendar },
    30: { bg: "from-emerald-500 to-green-600", badgeBg: "bg-emerald-300/30", badgeText: "text-emerald-100", label: "POPULAR", icon: CalendarCheck },
    365: { bg: "from-violet-500 to-purple-600", badgeBg: "bg-amber-400/30", badgeText: "text-amber-100", label: "SAVING", icon: CalendarDays },
  };
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {plans.map((p) => {
          const s = styles[p.duration_days ?? 0] ?? styles[30];
          const Icon = s.icon;
          return (
            <button key={p.id} onClick={() => onBuy(p)} className="glass-card rounded-2xl overflow-hidden text-left hover:scale-[1.02] transition-transform">
              <div className={`bg-gradient-to-br ${s.bg} p-5 text-center relative`}>
                <Icon className="w-6 h-6 mx-auto text-white/95" />
                <div className="text-white font-bold text-xl mt-1.5">{p.duration_days} {p.duration_days === 1 ? "Day" : "Days"}</div>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${s.badgeBg} ${s.badgeText}`}>{s.label}</span>
              </div>
              <div className="p-4 flex items-baseline justify-between">
                <div><span className="text-lg font-bold">{p.max_reveals ?? 100}</span> <span className="text-xs text-muted-foreground">socks</span></div>
                <div className="text-success font-bold">{fmtUsd(p.price_usd)}</div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> Click on any plan to select payment method
      </p>
      {dialog}
    </>
  );
}

/* ---------------- CREDIT plans (3 tiered cards with multiple tiers) ---------------- */
function CreditGrid({ plans, onBuy, dialog }: { plans: any[]; onBuy: (p: any) => void; dialog: React.ReactNode }) {
  // Group by tier via sort_order / price bands: Starter (cheapest 2), Standard (mid 2), Premium (top)
  const sorted = [...plans].sort((a, b) => Number(a.price_usd) - Number(b.price_usd));
  const tiers = [
    { name: "Starter", tagline: "Perfect for beginners", bg: "from-orange-500 to-amber-600", icon: Medal, iconBg: "bg-white/25", accent: "text-orange-100" },
    { name: "Standard", tagline: "Most popular choice", bg: "from-slate-400 to-slate-600", icon: Trophy, iconBg: "bg-white/25", accent: "text-slate-100", badge: { label: "POPULAR", bg: "bg-slate-300/40 text-slate-50" } },
    { name: "Premium", tagline: "Best value for pros", bg: "from-yellow-400 to-amber-500", icon: Crown, iconBg: "bg-black/20", accent: "text-yellow-950", badge: { label: "BEST DEAL", bg: "bg-red-500 text-white" } },
  ];
  const groups: any[][] = [[], [], []];
  sorted.forEach((p, i) => {
    const g = i < 2 ? 0 : i < 4 ? 1 : 2;
    groups[g].push(p);
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t, i) => {
          const Icon = t.icon;
          const groupPlans = groups[i];
          return (
            <div key={t.name} className="glass-card rounded-2xl overflow-hidden">
              <div className={`bg-gradient-to-br ${t.bg} p-6 text-center relative`}>
                {t.badge && (
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${t.badge.bg}`}>{t.badge.label}</span>
                )}
                <div className={`w-12 h-12 rounded-full ${t.iconBg} mx-auto flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${i === 2 ? "text-yellow-950" : "text-white"}`} />
                </div>
                <div className={`font-bold text-xl mt-2 ${i === 2 ? "text-yellow-950" : "text-white"}`}>{t.name}</div>
                <div className={`text-xs mt-0.5 ${t.accent}`}>{t.tagline}</div>
              </div>
              <div className="p-4 space-y-2">
                {groupPlans.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6">Coming soon</div>
                )}
                {groupPlans.map((p) => (
                  <button key={p.id} onClick={() => onBuy(p)}
                    className="w-full flex items-baseline justify-between px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-primary/10 border border-border/40 hover:border-primary/40 transition">
                    <div>
                      <span className="text-base font-bold">{p.credits ?? 0}</span>
                      <span className="text-xs text-muted-foreground ml-1">credits</span>
                    </div>
                    <div className="text-success font-bold">{fmtUsd(p.price_usd)}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4">∞ Credits never expire — use anytime!</p>
      {dialog}
    </>
  );
}

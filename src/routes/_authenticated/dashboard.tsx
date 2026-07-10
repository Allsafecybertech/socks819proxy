import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatCard, EmptyState } from "@/components/ui-kit";
import { Activity, Eye, Coins, Timer, Receipt, Bell, TrendingUp, ShoppingCart, Boxes } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NOVAIN SOCKS" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [chart, setChart] = useState<{ day: string; reveals: number }[]>([]);
  const [assignedCount, setAssignedCount] = useState(0);
  const [hasVerifiedOrder, setHasVerifiedOrder] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [sub, credits, orders, verifiedOrders, viewed24, viewedAll, notif, assigned] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("credit_balances").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "verified"),
        supabase.from("viewed_proxies").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("revealed_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.from("viewed_proxies").select("revealed_at").eq("user_id", user.id).gte("revealed_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
        supabase.from("inventory").select("id", { count: "exact", head: true }).eq("assigned_user_id", user.id),
      ]);
      const remaining = sub.data?.max_reveals ? sub.data.max_reveals - sub.data.reveals_used : null;
      setAssignedCount(assigned.count ?? 0);
      setHasVerifiedOrder((verifiedOrders.count ?? 0) > 0 || (credits.data?.balance ?? 0) > 0 || !!sub.data);
      setStats({
        sub: sub.data, credits: credits.data?.balance ?? 0, orders: orders.count ?? 0,
        viewedToday: viewed24.count ?? 0, totalViews: viewedAll.data?.length ?? 0,
        notif: notif.count ?? 0, remaining,
      });
      const buckets: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000); buckets[d.toISOString().slice(0, 10)] = 0;
      }
      viewedAll.data?.forEach((r: any) => {
        const k = r.revealed_at.slice(0, 10);
        if (buckets[k] !== undefined) buckets[k]++;
      });
      setChart(Object.entries(buckets).map(([day, reveals]) => ({ day: day.slice(5), reveals })));
      setLoading(false);
    })();
  }, [user?.id]);

  const greeting = `Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}`;

  if (loading) {
    return <><PageHeader title={greeting} subtitle="Loading…" right={<ClaimAdminBtn />} /></>;
  }

  // Empty state — user has never had a verified order or credits or subscription
  if (!hasVerifiedOrder && assignedCount === 0) {
    return (
      <>
        <PageHeader title={greeting} subtitle="Your account is ready — pick a plan to get started." right={<ClaimAdminBtn />} />
        <EmptyState
          icon={ShoppingCart}
          title="No proxies yet"
          subtitle="Choose a plan below. Once your payment is approved, your dashboard will fill with the proxies you paid for."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 max-w-2xl mx-auto">
          <Link to="/plans/daily" className="glass-card rounded-xl p-4 hover:border-primary/40 transition text-left">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Quick</div>
            <div className="text-lg font-bold mt-1">$1.50 / 24h</div>
            <div className="text-xs text-muted-foreground">One dedicated proxy</div>
          </Link>
          <Link to="/plans/daily" className="glass-card rounded-xl p-4 hover:border-primary/40 transition text-left">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Time</div>
            <div className="text-lg font-bold mt-1">Daily Plans</div>
            <div className="text-xs text-muted-foreground">1, 15, 30 or 365 days</div>
          </Link>
          <Link to="/plans/credits" className="glass-card rounded-xl p-4 hover:border-primary/40 transition text-left">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Credits</div>
            <div className="text-lg font-bold mt-1">Credit Plans</div>
            <div className="text-xs text-muted-foreground">Never expire</div>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={greeting} subtitle="Snapshot of your account activity" right={<ClaimAdminBtn />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Assigned Proxies" value={assignedCount} sub="Ready to use" icon={Boxes} accent />
        <StatCard label="Active Plan" value={stats.sub?.plan_type ?? "None"} sub={stats.sub?.expires_at ? `Expires ${fmtDate(stats.sub.expires_at)}` : stats.sub ? "No expiry" : "No active plan"} icon={Activity} />
        <StatCard label="Remaining Reveals" value={stats.remaining ?? (stats.sub?.max_reveals == null && stats.sub ? "∞" : "—")} icon={Timer} />
        <StatCard label="Credit Balance" value={stats.credits} icon={Coins} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Viewed Today" value={stats.viewedToday} sub={`${stats.totalViews} in last 30 days`} icon={Eye} />
        <StatCard label="Total Orders" value={stats.orders} icon={Receipt} />
        <StatCard label="Unread Notifications" value={stats.notif} icon={Bell} />
        <StatCard label="Plan Status" value={stats.sub?.is_active ? "Active" : "Idle"} icon={TrendingUp} />
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="mb-4">
          <div className="text-sm font-semibold">Reveal activity — last 30 days</div>
          <div className="text-xs text-muted-foreground">Proxies revealed per day</div>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="revealG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.19 265)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="oklch(0.68 0.19 265)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.03 265 / 0.3)" />
              <XAxis dataKey="day" stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} />
              <YAxis stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "oklch(0.20 0.035 265)", border: "1px solid oklch(0.32 0.04 265)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="reveals" stroke="oklch(0.68 0.19 265)" fill="url(#revealG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function ClaimAdminBtn() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin")
      .then(({ count }) => setVisible((count ?? 0) === 0));
  }, []);
  if (!visible) return null;
  async function claim() {
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error) return;
    if (data) window.location.reload();
  }
  return (
    <button onClick={claim} className="text-xs px-3 py-1.5 rounded-lg border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20">
      Become first admin
    </button>
  );
}

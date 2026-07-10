import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, ShoppingCart, List, Eye, CalendarDays, Coins, Infinity as InfIcon,
  Receipt, Wallet, Bell, LifeBuoy, User, Settings, Shield, LogOut, Menu,
  Users, Boxes, ClipboardCheck, BarChart3, FileClock, Sliders, Megaphone,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnnouncementBanner } from "@/components/announcement-banner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/buy", label: "Buy Proxies", icon: ShoppingCart },
  { to: "/proxies", label: "My Proxy List", icon: List },
  { to: "/viewed", label: "Viewed (24h)", icon: Eye },
  { to: "/plans/daily", label: "Daily Plans", icon: CalendarDays },
  { to: "/plans/credits", label: "Credit Plans", icon: Coins },
  { to: "/plans/lifetime", label: "Lifetime Plans", icon: InfIcon },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const ADMIN_NAV = [
  { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/plans", label: "Plans", icon: Coins },
  { to: "/admin/orders", label: "Payment Verification", icon: ClipboardCheck },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/admin/audit", label: "Audit Logs", icon: FileClock },
  { to: "/admin/settings", label: "System Settings", icon: Sliders },
] as const;

function AuthedLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-72 z-40 bg-sidebar border-r border-sidebar-border flex-col transition-transform duration-200",
          open ? "translate-x-0 flex" : "-translate-x-full lg:translate-x-0 lg:flex",
        )}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center glow">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">NOVAIN SOCKS</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Proxy Marketplace</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <NavGroup label="Workspace" items={NAV as any} current={path} />
          {isAdmin && <NavGroup label="Admin" items={ADMIN_NAV as any} current={path} />}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/40">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user.email}</div>
              <div className="text-[10px] text-muted-foreground">{isAdmin ? "Administrator" : "Member"}</div>
            </div>
            <button onClick={signOut} className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-border/60 bg-background/80 backdrop-blur px-4 lg:px-8 flex items-center gap-3">
          <button className="lg:hidden p-2" onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <NotificationsBell />
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <AnnouncementBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavGroup({ label, items, current }: { label: string; items: { to: string; label: string; icon: any }[]; current: string }) {
  return (
    <div>
      <div className="px-3 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">{label}</div>
      <div className="space-y-0.5">
        {items.map((i) => {
          const active = current === i.to || current.startsWith(i.to + "/");
          const Icon = i.icon;
          return (
            <Link
              key={i.to}
              to={i.to as any}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                active
                  ? "bg-primary/15 text-foreground border border-primary/30"
                  : "text-sidebar-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <Icon className={cn("w-4 h-4", active && "text-primary")} />
              <span className="truncate">{i.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NotificationsBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false)
      .then(({ count }) => setCount(count ?? 0));
  }, []);
  return (
    <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-muted/50">
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1">
          {count}
        </span>
      )}
    </Link>
  );
}

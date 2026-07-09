import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { Shield, Key, FileCode, Download, Eye, EyeOff, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — NOVAIN SOCKS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [twoFa, setTwoFa] = useState(false);
  const [sub, setSub] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [usedToday, setUsedToday] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => { setProfile(data); setUsername(data?.username ?? ""); });
    supabase.from("subscriptions").select("*, plans(name, max_reveals, plan_type)").eq("user_id", user.id).eq("is_active", true).maybeSingle()
      .then(({ data }) => setSub(data));
    supabase.from("credit_balances").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setCredits((data as any)?.balance ?? 0));
    const since = new Date(); since.setHours(0, 0, 0, 0);
    supabase.from("viewed_proxies").select("id", { count: "exact", head: true }).gte("revealed_at", since.toISOString())
      .then(({ count }) => setUsedToday(count ?? 0));
    supabase.from("audit_log").select("*").eq("actor_id", user.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setLogs(data ?? []));
  }, [user?.id]);

  const rules = [
    { label: "6-20 chars", ok: pwd.length >= 6 && pwd.length <= 20 },
    { label: "a-z", ok: /[a-z]/.test(pwd) },
    { label: "A-Z", ok: /[A-Z]/.test(pwd) },
    { label: "0-9", ok: /[0-9]/.test(pwd) },
    { label: "!@#$%", ok: /[^A-Za-z0-9]/.test(pwd) },
  ];

  async function save() {
    const { error } = await supabase.from("profiles").update({ username }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  }
  async function changePassword() {
    if (pwd !== pwd2) return toast.error("Passwords don't match");
    if (!rules.every((r) => r.ok)) return toast.error("Password doesn't meet requirements");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return toast.error(error.message);
    setPwd(""); setPwd2(""); toast.success("Password updated");
  }

  const planName = sub?.plans?.name ?? "No active plan";
  const quota = sub?.max_reveals ?? 0;
  const expiresAt = sub?.expires_at;

  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your account, security and session activity." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Account */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 gradient-primary text-primary-foreground font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" /> Account
          </div>
          <div className="p-5 space-y-2.5 text-sm">
            <Row k="Email" v={user?.email ?? "—"} />
            <Row k="Users" v={username || (user?.email?.split("@")[0] ?? "—")} />
            <Row k="Current Plan" v={planName} />
            {expiresAt && <Row k="Expired" v={fmtDate(expiresAt)} />}
            <Row k="Credit Remaining" v={String(credits)} />
            <Row k="Used Today" v={String(usedToday)} />
            <Row k="Total Reset Limit This Month" v={String(quota)} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3">
              <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10">
                <Shield className="w-3.5 h-3.5 mr-1.5" />No Auth Socks5
              </Button>
              <Button asChild size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                <Link to="/support"><FileCode className="w-3.5 h-3.5 mr-1.5" />API Docs</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10">
                <Link to="/viewed"><Download className="w-3.5 h-3.5 mr-1.5" />Export Socks</Link>
              </Button>
            </div>

            <div className="pt-3 border-t border-border/40 mt-3">
              <div className="text-xs font-semibold mb-2">Two-factor Authentication</div>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={twoFa} onChange={() => setTwoFa(true)} className="accent-primary" />
                  <span>Enable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!twoFa} onChange={() => setTwoFa(false)} className="accent-primary" />
                  <span className="text-muted-foreground">Disable</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-xs">Username</Label>
              <div className="flex gap-2 mt-1">
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="h-9" />
                <Button size="sm" className="gradient-primary" onClick={save}>Save</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 gradient-primary text-primary-foreground font-semibold flex items-center gap-2">
            <Key className="w-4 h-4" /> Change password
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div>
              <Label>Current Password</Label>
              <div className="relative">
                <Input type="password" placeholder="••••••••" className="pr-9" />
                <Eye className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} className="pr-9" />
                <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
                {rules.map((r) => (
                  <span key={r.label} className={`inline-flex items-center gap-1 ${r.ok ? "text-success" : "text-muted-foreground"}`}>
                    {r.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} className="pr-9" />
                <Eye className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="gradient-primary" onClick={changePassword}><Key className="w-4 h-4 mr-2" />Change Password</Button>
            </div>

            <div className="pt-3 border-t border-border/40">
              <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Security Tips</div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
                <li>Never share your password with anyone</li>
                <li>Use a unique password for this account</li>
                <li>Enable Two-Factor Authentication (2FA)</li>
                <li>Change your password regularly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Information */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 gradient-primary text-primary-foreground font-semibold">Logs Information</div>
        {logs.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No recent activity</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <tr>{["Information", "Metadata", "Time"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border/40">
                    <td className="px-4 py-2.5">{l.action}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[300px]">{l.entity ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-semibold">{k}:</span>
      <span className="text-muted-foreground text-right">{v}</span>
    </div>
  );
}

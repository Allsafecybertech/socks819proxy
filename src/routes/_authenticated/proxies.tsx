import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, Pill, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { Boxes, Copy, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/proxies")({
  head: () => ({ meta: [{ title: "My Proxy List — NOVAIN SOCKS" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Release any expired assignments first (best effort)
      await supabase.rpc("release_expired_assignments").catch(() => {});
      const { data } = await supabase
        .from("inventory")
        .select("*")
        .eq("assigned_user_id", user.id)
        .order("assigned_at", { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  function copyRow(r: any) {
    const line = `${r.ip}:${r.port}${r.username ? `:${r.username}:${r.password ?? ""}` : ""}`;
    navigator.clipboard.writeText(line);
    toast.success("Copied");
  }

  function exportTxt() {
    const txt = rows.map((r) => `${r.ip}:${r.port}${r.username ? `:${r.username}:${r.password ?? ""}` : ""}`).join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "my-proxies.txt"; a.click();
  }

  if (loading) return <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">Loading…</div>;

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="My Proxy List" subtitle="Proxies assigned to your account after payment approval." />
        <EmptyState
          icon={Boxes}
          title="No proxies yet"
          subtitle="Once your payment is approved, the proxies you paid for will appear here automatically."
        >
          <Link to="/plans/daily" className="inline-block mt-4 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">
            Browse Plans
          </Link>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="My Proxy List" subtitle={`${rows.length} proxies assigned to your account`} right={
        <Button variant="outline" onClick={exportTxt}><Download className="w-4 h-4 mr-2" />Export .txt</Button>
      } />
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>{["IP:PORT", "COUNTRY", "REGION", "CITY", "HOST", "ONLINE", "ZIPCODE", "LAST VIEW", "BLACKLIST", "SPEED", "TYPE", "USER / PASS", ""].map((h) =>
                <th key={h} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/40 hover:bg-primary/5">
                  <td className="px-3 py-2.5 font-mono text-xs text-primary whitespace-nowrap">{r.ip}:{r.port}</td>
                  <td className="px-3 py-2.5">{r.country ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.region ?? "—"}</td>
                  <td className="px-3 py-2.5">{r.city ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[160px]">{r.host ?? r.isp ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <Pill className={r.is_online ? "text-success bg-success/10 border-success/30" : "text-muted-foreground border-border"}>
                      {r.is_online ? "Online" : "Offline"}
                    </Pill>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{r.zipcode ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.last_view_at ? fmtDate(r.last_view_at) : "—"}</td>
                  <td className="px-3 py-2.5">
                    <Pill className={r.blacklisted ? "text-destructive bg-destructive/10 border-destructive/30" : "text-success bg-success/10 border-success/30"}>
                      {r.blacklisted ? "Yes" : "No"}
                    </Pill>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.speed ?? "—"}</td>
                  <td className="px-3 py-2.5"><Pill className="border-primary/30 bg-primary/10 text-primary">{r.proxy_kind ?? "—"}</Pill></td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    <div>{r.username ?? "—"}</div>
                    <div className="text-muted-foreground">{r.password ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right"><Button size="sm" variant="ghost" onClick={() => copyRow(r)}><Copy className="w-3.5 h-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

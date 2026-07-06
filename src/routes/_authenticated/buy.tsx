import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill, EmptyState } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Search, Copy, Boxes } from "lucide-react";
import { toast } from "sonner";
import { statusColor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buy")({
  head: () => ({ meta: [{ title: "Buy Proxies — NOVAIN SOCKS" }] }),
  component: BuyPage,
});

function BuyPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("all");
  const [kind, setKind] = useState("all");
  const [revealing, setRevealing] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("inventory_listing").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, []);

  const countries = Array.from(new Set(rows.map((r) => r.country))).sort();
  const filtered = rows.filter((r) => {
    if (country !== "all" && r.country !== country) return false;
    if (kind !== "all" && r.proxy_kind !== kind) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function chooseSource(id: string) {
    setRevealing(id);
  }

  async function doReveal(source: "time_plan" | "credit") {
    if (!revealing) return;
    const { data, error } = await supabase.rpc("reveal_proxy", { _inventory_id: revealing, _source: source });
    if (error) { toast.error(error.message); setRevealing(null); return; }
    const row = (data as any)?.[0];
    setRevealed(row);
    setRevealing(null);
    setRows((prev) => prev.filter((r) => r.id !== revealing));
    toast.success("Proxy revealed — moved to Viewed (24h)");
  }

  return (
    <>
      <PageHeader title="Buy Proxies" subtitle="Filter available stock and reveal credentials on demand" right={
        <Button variant="outline" onClick={() => nav({ to: "/viewed" })}><Eye className="w-4 h-4 mr-2" />Viewed (24h)</Button>
      } />

      <div className="glass-card rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search country, city, ISP, host…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="datacenter">Datacenter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Boxes} title="No proxies match your filters" subtitle="Try broadening the search or check back soon." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
                <tr>
                  {["Country", "Region", "City", "ISP", "Speed", "Auth", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20 transition">
                    <td className="px-4 py-3 font-medium">{r.country}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.region ?? "—"}</td>
                    <td className="px-4 py-3">{r.city ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.isp ?? "—"}</td>
                    <td className="px-4 py-3">{r.speed ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.auth_type ?? "—"}</td>
                    <td className="px-4 py-3"><Pill className={statusColor(r.status)}>{r.status}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" className="gradient-primary" onClick={() => chooseSource(r.id)}>
                        <Eye className="w-3.5 h-3.5 mr-1.5" />Reveal
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!revealing} onOpenChange={(o) => !o && setRevealing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reveal proxy</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Choose how this reveal is charged.</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Button variant="outline" onClick={() => doReveal("time_plan")}>Use Time Plan</Button>
            <Button className="gradient-primary" onClick={() => doReveal("credit")}>Use 1 Credit</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revealed} onOpenChange={(o) => !o && setRevealed(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Proxy Credentials</DialogTitle></DialogHeader>
          {revealed && (
            <div className="space-y-2">
              <CredRow label="IP" value={revealed.ip} />
              <CredRow label="Port" value={String(revealed.port)} />
              <CredRow label="Username" value={revealed.username ?? ""} />
              <CredRow label="Password" value={revealed.password ?? ""} />
              <div className="text-xs text-muted-foreground pt-2">Available in Viewed (24h) for 24 hours.</div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setRevealed(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border/50 px-3 py-2">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-mono text-sm">{value || "—"}</div>
      </div>
      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied`); }}>
        <Copy className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, Pill, EmptyState } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Search, Copy, Boxes, Filter, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { statusColor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buy")({
  head: () => ({ meta: [{ title: "Buy Proxies — NOVAIN SOCKS" }] }),
  component: BuyPage,
});

const PAGE_SIZE = 25;

function BuyPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [zipQ, setZipQ] = useState("");
  const [hostQ, setHostQ] = useState("");
  const [auth, setAuth] = useState("all");
  const [type, setType] = useState("all");
  const [country, setCountry] = useState("all");
  const [region, setRegion] = useState("all");
  const [city, setCity] = useState("all");
  const [blacklist, setBlacklist] = useState("all");
  const [page, setPage] = useState(1);
  const [used, setUsed] = useState(0);
  const [quota, setQuota] = useState(100);
  const [revealing, setRevealing] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("inventory_listing").select("*").order("created_at", { ascending: false }).limit(2000)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!user) return;
    const since = new Date(); since.setHours(0, 0, 0, 0);
    supabase.from("viewed_proxies").select("id", { count: "exact", head: true }).gte("revealed_at", since.toISOString())
      .then(({ count }) => setUsed(count ?? 0));
    supabase.from("subscriptions").select("plans(max_reveals)").eq("user_id", user.id).eq("is_active", true).maybeSingle()
      .then(({ data }) => { const q = (data as any)?.max_reveals; if (q) setQuota(q); });
  }, [user?.id]);

  const countries = useMemo(() => Array.from(new Set(rows.map((r) => r.country).filter(Boolean))).sort() as string[], [rows]);
  const regions = useMemo(() => Array.from(new Set(rows.filter((r) => country === "all" || r.country === country).map((r) => r.region).filter(Boolean))).sort() as string[], [rows, country]);
  const cities = useMemo(() => Array.from(new Set(rows.filter((r) => (country === "all" || r.country === country) && (region === "all" || r.region === region)).map((r) => r.city).filter(Boolean))).sort() as string[], [rows, country, region]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (auth !== "all" && (r.auth_type ?? "none") !== auth) return false;
    if (type !== "all" && r.proxy_kind !== type) return false;
    if (country !== "all" && r.country !== country) return false;
    if (region !== "all" && r.region !== region) return false;
    if (city !== "all" && r.city !== city) return false;
    if (zipQ && !(r.zipcode ?? "").toLowerCase().includes(zipQ.toLowerCase())) return false;
    if (hostQ && !(r.host ?? "").toLowerCase().includes(hostQ.toLowerCase())) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, auth, type, country, region, city, zipQ, hostQ, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function reset() {
    setQ(""); setZipQ(""); setHostQ(""); setAuth("all"); setType("all");
    setCountry("all"); setRegion("all"); setCity("all"); setBlacklist("all"); setPage(1);
  }

  async function doReveal(source: "time_plan" | "credit") {
    if (!revealing) return;
    const { data, error } = await supabase.rpc("reveal_proxy", { _inventory_id: revealing, _source: source });
    if (error) { toast.error(error.message); setRevealing(null); return; }
    const row = (data as any)?.[0];
    setRevealed(row); setRevealing(null);
    setRows((prev) => prev.filter((r) => r.id !== revealing));
    setUsed((n) => n + 1);
    toast.success("Proxy revealed — moved to Viewed (24h)");
  }

  const pct = Math.min(100, (used / quota) * 100);

  return (
    <>
      <PageHeader title="Buy Proxies" subtitle="Filter live inventory and reveal credentials on demand" right={
        <Button variant="outline" onClick={() => nav({ to: "/viewed" })}><Eye className="w-4 h-4 mr-2" />Viewed (24h)</Button>
      } />

      {/* Filter Socks */}
      <div className="glass-card rounded-2xl overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-sm font-semibold">
          <Filter className="w-4 h-4 text-primary" /> Filter Socks
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select value={auth} onValueChange={setAuth}>
            <SelectTrigger><SelectValue placeholder="All Auth" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Auth</SelectItem>
              <SelectItem value="user_pass">User / Pass</SelectItem>
              <SelectItem value="ip_whitelist">IP Whitelist</SelectItem>
              <SelectItem value="none">No Auth</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="All Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Type</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="cellular">Cellular</SelectItem>
              <SelectItem value="hosting">Hosting</SelectItem>
              <SelectItem value="datacenter">Datacenter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={(v) => { setCountry(v); setRegion("all"); setCity("all"); }}>
            <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All Country ({rows.length})</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={(v) => { setRegion(v); setCity("all"); }}>
            <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All Region</SelectItem>
              {regions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All City</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={blacklist} onValueChange={setBlacklist}>
            <SelectTrigger><SelectValue placeholder="Blacklist" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Blacklist: Any</SelectItem>
              <SelectItem value="no">Clean only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search IP, ISP, host, city…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Button className="gradient-primary" onClick={() => setPage(1)}><Search className="w-4 h-4 mr-1.5" />Search</Button>
          <Button variant="outline" onClick={reset}><RotateCcw className="w-4 h-4 mr-1.5" />Reset</Button>
        </div>
      </div>

      {/* Zipcode / Host search */}
      <div className="glass-card rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-sm font-semibold flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" /> Search by Zipcode / Host
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          <Input placeholder="Zipcode: 30721, 24421…" value={zipQ} onChange={(e) => setZipQ(e.target.value)} className="max-w-xs" />
          <Input placeholder="Host: verizon…" value={hostQ} onChange={(e) => setHostQ(e.target.value)} className="max-w-xs" />
          <Button variant="outline" onClick={() => setPage(1)}><Search className="w-4 h-4 mr-1.5" />Search</Button>
        </div>
      </div>

      {/* Usage / count */}
      <div className="glass-card rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium">Used Plan Daily today: <span className="text-primary font-bold">{used}</span> / {quota}</span>
            <span className="text-muted-foreground">{Math.round(pct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Showing <span className="text-foreground font-semibold">{pageRows.length}</span> of <span className="text-foreground font-semibold">{filtered.length.toLocaleString()}</span> socks
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Boxes} title="No proxies match your filters" subtitle="Try broadening the search or check back soon." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <tr>{["IP", "Country", "Region", "City", "Host", "Zipcode", "Blacklist", "Speed", "Type", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const ipMasked = "•••.•••.•••.•••";
                  return (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-primary/5 transition">
                      <td className="px-3 py-2.5 font-mono text-xs text-primary">{ipMasked}</td>
                      <td className="px-3 py-2.5">{r.country ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.region ?? "—"}</td>
                      <td className="px-3 py-2.5">{r.city ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[160px]">{r.host ?? r.isp ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{r.zipcode ?? "—"}</td>
                      <td className="px-3 py-2.5"><Pill className="text-success bg-success/10 border-success/30">No</Pill></td>
                      <td className="px-3 py-2.5 font-mono text-xs">{r.speed ?? "—"}</td>
                      <td className="px-3 py-2.5"><Pill className={statusColor(r.status)}>{r.proxy_kind ?? "—"}</Pill></td>
                      <td className="px-3 py-2.5 text-right">
                        <Button size="sm" className="gradient-primary h-7 px-3" onClick={() => setRevealing(r.id)}>
                          <Eye className="w-3 h-3 mr-1" />Reveal
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 py-4 border-t border-border/40">
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
            {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
              const n = i + 1;
              return (
                <Button key={n} size="sm" variant={page === n ? "default" : "ghost"} className={page === n ? "gradient-primary h-8 w-8 p-0" : "h-8 w-8 p-0"} onClick={() => setPage(n)}>{n}</Button>
              );
            })}
            {totalPages > 7 && <span className="text-muted-foreground text-sm px-1">…</span>}
            {totalPages > 7 && (
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setPage(totalPages)}>{totalPages}</Button>
            )}
            <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</Button>
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

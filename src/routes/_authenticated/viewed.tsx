import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/viewed")({
  head: () => ({ meta: [{ title: "List Socks 24H — NOVAIN SOCKS" }] }),
  component: ViewedPage,
});

function ViewedPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("viewed_proxies").select("*")
      .gt("expires_at", new Date().toISOString())
      .order("revealed_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  function download(format: "txt" | "csv" | "json") {
    let content = "";
    if (format === "json") content = JSON.stringify(rows, null, 2);
    else if (format === "csv") {
      content = "ip,port,username,password,country,region,city,host,zipcode,speed,type\n" +
        rows.map((r) => [r.ip, r.port, r.username, r.password, r.country, r.region, r.city, r.isp, r.zipcode, r.speed, r.proxy_kind].map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    } else {
      content = rows.map((r) => `${r.ip}:${r.port}:${r.username}:${r.password}`).join("\n");
    }
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `novain-proxies.${format}`;
    a.click();
  }

  function showRaw() {
    setRaw(rows.map((r) => `${r.ip}:${r.port}:${r.username}:${r.password}`).join("\n"));
  }

  return (
    <>
      <PageHeader title="List Socks 24H" subtitle="Revealed proxies auto-expire 24 hours after reveal." right={
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="gradient-primary" onClick={showRaw}><FileText className="w-3.5 h-3.5 mr-1.5" />Get Raw Text</Button>
          <Button variant="outline" size="sm" onClick={() => download("txt")}><Download className="w-3.5 h-3.5 mr-1.5" />TXT</Button>
          <Button variant="outline" size="sm" onClick={() => download("csv")}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => download("json")}><Download className="w-3.5 h-3.5 mr-1.5" />JSON</Button>
        </div>
      } />

      {rows.length === 0 ? (
        <EmptyState icon={Eye} title="No revealed proxies" subtitle="Head to Buy Proxies and reveal one." />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <tr>{["Socks", "Country", "Region", "City", "Host", "Zipcode", "Speed", "Type", "Time View", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const full = `${r.ip}:${r.port}:${r.username}:${r.password}`;
                  return (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-primary/5 transition">
                      <td className="px-3 py-2.5 font-mono text-xs text-primary max-w-[240px] truncate">{full}</td>
                      <td className="px-3 py-2.5">{r.country ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.region ?? "—"}</td>
                      <td className="px-3 py-2.5">{r.city ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[160px]">{r.isp ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{r.zipcode ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{r.speed ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.proxy_kind ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(r.revealed_at)}</td>
                      <td className="px-3 py-2.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { navigator.clipboard.writeText(full); toast.success("Copied"); }}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!raw} onOpenChange={(o) => !o && setRaw(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Raw Socks Text</DialogTitle></DialogHeader>
          <textarea readOnly value={raw ?? ""} className="w-full h-72 rounded-lg bg-muted/40 border border-border/50 p-3 font-mono text-xs" />
          <div className="flex justify-end">
            <Button className="gradient-primary" onClick={() => { navigator.clipboard.writeText(raw ?? ""); toast.success("Copied to clipboard"); }}>
              <Copy className="w-4 h-4 mr-2" />Copy all
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

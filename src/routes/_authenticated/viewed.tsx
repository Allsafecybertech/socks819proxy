import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Copy, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/viewed")({
  head: () => ({ meta: [{ title: "Viewed (24h) — NOVAIN SOCKS" }] }),
  component: ViewedPage,
});

function ViewedPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("viewed_proxies").select("*")
      .gt("expires_at", new Date().toISOString())
      .order("revealed_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  function downloadFormat(format: "txt" | "csv" | "json") {
    let content = "";
    if (format === "json") content = JSON.stringify(rows, null, 2);
    else if (format === "csv") {
      content = "ip,port,username,password,country,city,isp\n" + rows.map((r) => [r.ip, r.port, r.username, r.password, r.country, r.city, r.isp].map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    } else {
      content = rows.map((r) => `${r.ip}:${r.port}:${r.username}:${r.password}`).join("\n");
    }
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `novain-proxies.${format}`;
    a.click();
  }

  return (
    <>
      <PageHeader title="Viewed (24 Hours)" subtitle="Revealed proxies auto-expire 24 hours after reveal." right={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadFormat("txt")}><Download className="w-3.5 h-3.5 mr-1.5" />TXT</Button>
          <Button variant="outline" size="sm" onClick={() => downloadFormat("csv")}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => downloadFormat("json")}><Download className="w-3.5 h-3.5 mr-1.5" />JSON</Button>
        </div>
      } />

      {rows.length === 0 ? (
        <EmptyState icon={Eye} title="No revealed proxies" subtitle="Head to Buy Proxies and reveal one." />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
                <tr>{["Country", "City", "ISP", "IP:Port", "Username", "Password", "Revealed", ""].map((h) => (<th key={h} className="px-4 py-3 text-left font-medium">{h}</th>))}</tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const full = `${r.ip}:${r.port}:${r.username}:${r.password}`;
                  return (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="px-4 py-3">{r.country ?? "—"}</td>
                      <td className="px-4 py-3">{r.city ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.isp ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.ip}:{r.port}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.username}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.password}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.revealed_at)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(full); toast.success("Copied"); }}>
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
    </>
  );
}

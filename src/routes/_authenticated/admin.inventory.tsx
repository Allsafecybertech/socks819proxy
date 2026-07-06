import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { statusColor } from "@/lib/format";
import { Plus, Download, Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Admin" }] }),
  component: InventoryPage,
});

const EMPTY = { country:"", region:"", city:"", zipcode:"", isp:"", host:"", speed:"", auth_type:"user_pass", proxy_kind:"residential", ip:"", port:1080, username:"", password:"" };

function InventoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);

  async function load() {
    const { data } = await supabase.from("inventory").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    const { error } = await supabase.from("inventory").insert({ ...form, port: Number(form.port) });
    if (error) return toast.error(error.message);
    setOpen(false); setForm(EMPTY); toast.success("Added"); load();
  }
  async function del(id: string) {
    await supabase.from("inventory").delete().eq("id", id);
    toast.success("Deleted"); load();
  }
  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const [head, ...lines] = text.trim().split(/\r?\n/);
    const cols = head.split(",").map((s) => s.trim());
    const items = lines.map((line) => {
      const vals = line.split(",");
      const o: any = {}; cols.forEach((c, i) => (o[c] = vals[i]?.trim())); if (o.port) o.port = Number(o.port);
      return o;
    });
    const { error } = await supabase.from("inventory").insert(items);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${items.length} rows`); load();
  }
  function exportCsv() {
    const cols = ["country","region","city","isp","host","speed","auth_type","proxy_kind","ip","port","username","password","status"];
    const csv = cols.join(",") + "\n" + rows.map((r) => cols.map((c) => `"${r[c] ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "inventory.csv"; a.click();
  }

  const filtered = rows.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Inventory" subtitle="Proxy stock. Only available items appear in Buy Proxies." right={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          <label className="cursor-pointer inline-flex items-center h-10 px-3 rounded-md border border-input hover:bg-muted/40 text-sm"><Upload className="w-4 h-4 mr-2" />Import CSV<input type="file" hidden accept=".csv" onChange={importCsv} /></label>
          <Button className="gradient-primary" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Add</Button>
        </div>
      } />

      <div className="mb-3"><Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>{["Country","City","ISP","Type","IP:Port","Auth","Status",""].map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="px-4 py-3">{r.country}</td>
                  <td className="px-4 py-3">{r.city ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.isp ?? "—"}</td>
                  <td className="px-4 py-3">{r.proxy_kind ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.ip}:{r.port}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.auth_type ?? "—"}</td>
                  <td className="px-4 py-3"><Pill className={statusColor(r.status)}>{r.status}</Pill></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add proxy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[["country","Country"],["region","Region"],["city","City"],["zipcode","Zipcode"],["isp","ISP"],["host","Host"],["speed","Speed"],["ip","IP"],["port","Port"],["username","Username"],["password","Password"]].map(([k,l]) => (
              <div key={k}><Label>{l}</Label><Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            <div><Label>Type</Label>
              <Select value={form.proxy_kind} onValueChange={(v) => setForm({...form, proxy_kind:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="residential">Residential</SelectItem><SelectItem value="datacenter">Datacenter</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Auth</Label>
              <Select value={form.auth_type} onValueChange={(v) => setForm({...form, auth_type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="user_pass">Username/Password</SelectItem><SelectItem value="ip_whitelist">IP whitelist</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="gradient-primary" onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

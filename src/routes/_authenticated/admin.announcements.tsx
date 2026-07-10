import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { Plus, Trash2, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Admin" }] }),
  component: Page,
});

const EMPTY = { title: "", body: "", severity: "info" as "info" | "warning" | "critical", is_active: true };

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form.title || !form.body) return toast.error("Title and message are required");
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({ ...form, created_by: user?.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(false); setForm(EMPTY); toast.success("Announcement posted"); void load();
  }
  async function toggle(id: string, is_active: boolean) {
    await supabase.from("announcements").update({ is_active: !is_active }).eq("id", id);
    void load();
  }
  async function del(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    toast.success("Deleted"); void load();
  }

  return (
    <>
      <PageHeader title="Announcements" subtitle="Post site-wide banners visible to every signed-in user." right={
        <Button className="gradient-primary" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New announcement</Button>
      } />

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>{["Title", "Message", "Severity", "Active", "Posted", ""].map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No announcements yet.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-md truncate">{r.body}</td>
                  <td className="px-4 py-3"><Pill className={r.severity === "critical" ? "border-destructive/40 text-destructive bg-destructive/10" : r.severity === "warning" ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : "border-primary/40 text-primary bg-primary/10"}>{r.severity}</Pill></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(r.id, r.is_active)} className={r.is_active ? "text-success text-xs font-semibold" : "text-muted-foreground text-xs"}>
                      <Power className="w-3.5 h-3.5 inline mr-1" />{r.is_active ? "Active" : "Off"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Scheduled maintenance" /></div>
            <div><Label>Message</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="We'll be performing maintenance on…" /></div>
            <div><Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v: any) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="gradient-primary" onClick={save} disabled={busy}>{busy ? "Posting…" : "Post"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

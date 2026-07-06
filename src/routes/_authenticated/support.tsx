import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { statusColor, fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — NOVAIN SOCKS" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");

  async function load() {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!user || !subject || !body) return;
    const { data: t, error } = await supabase.from("support_tickets").insert({
      user_id: user.id, subject, priority: priority as any,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("support_messages").insert({ ticket_id: t.id, author_id: user.id, body });
    setOpen(false); setSubject(""); setBody("");
    toast.success("Ticket opened");
    load();
  }

  return (
    <>
      <PageHeader title="Support Tickets" subtitle="Reach our team any time." right={<Button className="gradient-primary" onClick={() => setOpen(true)}>New Ticket</Button>} />
      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>{["Subject","Priority","Status","Updated"].map((h) => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-border/50">
                <td className="px-4 py-3">{t.subject}</td>
                <td className="px-4 py-3"><Pill className="border-border">{t.priority}</Pill></td>
                <td className="px-4 py-3"><Pill className={statusColor(t.status)}>{t.status}</Pill></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(t.updated_at)}</td>
              </tr>
            ))}
            {tickets.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-muted-foreground text-sm">No tickets yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Message</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="gradient-primary" onClick={create}>Open Ticket</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

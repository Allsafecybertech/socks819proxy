import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { Bell } from "lucide-react";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — NOVAIN SOCKS" }] }),
  component: NotifPage,
});

function NotifPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)
      .then(async ({ data }) => {
        setItems(data ?? []);
        const unread = (data ?? []).filter((n) => !n.is_read).map((n) => n.id);
        if (unread.length) await supabase.from("notifications").update({ is_read: true }).in("id", unread);
      });
  }, []);
  return (
    <>
      <PageHeader title="Notifications" subtitle="Recent activity from your account." />
      {items.length === 0 ? <EmptyState icon={Bell} title="Inbox is empty" /> : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className="glass-card rounded-xl p-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0"><Bell className="w-4 h-4 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">{fmtDate(n.created_at)}</div>
                </div>
                {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

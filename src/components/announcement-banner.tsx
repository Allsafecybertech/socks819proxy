import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { X, Info, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
};

const styles: Record<string, { bar: string; icon: any }> = {
  info: { bar: "bg-primary/15 border-primary/30 text-foreground", icon: Info },
  warning: { bar: "bg-amber-500/15 border-amber-500/40 text-amber-100", icon: AlertTriangle },
  critical: { bar: "bg-destructive/15 border-destructive/40 text-destructive-foreground", icon: AlertOctagon },
};

export function AnnouncementBanner() {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const [{ data: anns }, { data: dismissed }] = await Promise.all([
        supabase.from("announcements").select("id,title,body,severity").order("created_at", { ascending: false }),
        supabase.from("announcement_dismissals").select("announcement_id").eq("user_id", user.id),
      ]);
      if (!mounted) return;
      const dismissedIds = new Set((dismissed ?? []).map((d: any) => d.announcement_id));
      setItems(((anns ?? []) as Announcement[]).filter((a) => !dismissedIds.has(a.id)));
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  async function dismiss(id: string) {
    if (!user) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    await supabase.from("announcement_dismissals").insert({ user_id: user.id, announcement_id: id });
  }

  if (items.length === 0) return null;
  return (
    <div className="space-y-2 mb-4">
      {items.map((a) => {
        const s = styles[a.severity] ?? styles.info;
        const Icon = s.icon;
        return (
          <div key={a.id} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", s.bar)}>
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{a.title}</div>
              <div className="text-xs opacity-90 whitespace-pre-wrap">{a.body}</div>
            </div>
            <button onClick={() => dismiss(a.id)} className="p-1 rounded hover:bg-white/10" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

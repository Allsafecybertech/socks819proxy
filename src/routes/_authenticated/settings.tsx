import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — NOVAIN SOCKS" }] }),
  component: () => (
    <>
      <PageHeader title="Settings" subtitle="Preferences for notifications and interface." />
      <div className="glass-card rounded-2xl p-6 space-y-4 max-w-xl">
        <SwitchRow label="Email notifications for approved payments" defaultChecked />
        <SwitchRow label="Email notifications for expiring plans" defaultChecked />
        <SwitchRow label="Enable session timeout after 30 min idle" />
      </div>
    </>
  ),
});

function SwitchRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <Label className="cursor-pointer">{label}</Label>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

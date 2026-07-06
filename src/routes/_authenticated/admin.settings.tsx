import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-kit";
import { CRYPTO_LABELS, CRYPTO_LIST } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "System Settings — Admin" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [wallets, setWallets] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("system_settings").select("key,value").like("key", "wallet.%");
    const map: Record<string,string> = {};
    (data ?? []).forEach((r: any) => { map[r.key.replace("wallet.","")] = (r.value as string) || ""; });
    setWallets(map);
  }
  useEffect(() => { load(); }, []);

  async function save(c: string) {
    const { error } = await supabase.from("system_settings").upsert({ key: `wallet.${c}`, value: JSON.stringify(wallets[c] ?? "") as any });
    if (error) return toast.error(error.message);
    toast.success(`${CRYPTO_LABELS[c]} wallet saved`);
  }

  return (
    <>
      <PageHeader title="System Settings" subtitle="Configure receiving wallets and platform preferences." />
      <div className="glass-card rounded-2xl p-6 space-y-4 max-w-2xl">
        <div className="font-semibold mb-2">Receiving Wallets</div>
        {CRYPTO_LIST.map((c) => (
          <div key={c} className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2 items-end">
            <Label className="pb-2">{CRYPTO_LABELS[c]}</Label>
            <Input value={wallets[c] ?? ""} onChange={(e) => setWallets({ ...wallets, [c]: e.target.value })} placeholder="Address" />
            <Button variant="outline" onClick={() => save(c)}>Save</Button>
          </div>
        ))}
      </div>
    </>
  );
}

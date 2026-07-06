import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-kit";
import { CRYPTO_LABELS, CRYPTO_LIST } from "@/lib/format";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — NOVAIN SOCKS" }] }),
  component: WalletPage,
});

function WalletPage() {
  const [wallets, setWallets] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("system_settings").select("key,value").like("key", "wallet.%")
      .then(({ data }) => {
        const map: Record<string,string> = {};
        (data ?? []).forEach((r: any) => { map[r.key.replace("wallet.","")] = (r.value as string) || ""; });
        setWallets(map);
      });
  }, []);

  return (
    <>
      <PageHeader title="Payment Wallets" subtitle="Send crypto directly to these addresses when completing an order." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CRYPTO_LIST.map((c) => {
          const addr = wallets[c] || "";
          const qr = addr ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=1e1e2e&color=ffffff&data=${encodeURIComponent(addr)}` : null;
          return (
            <div key={c} className="glass-card rounded-2xl p-5 flex gap-4 items-center">
              <div className="w-[100px] h-[100px] rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
                {qr ? <img src={qr} alt={`${c} QR`} className="w-full h-full object-cover" /> : <span className="text-[10px] text-muted-foreground text-center px-2">No address</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{CRYPTO_LABELS[c]}</div>
                <div className="mt-1 text-xs font-mono break-all">{addr || "Not configured yet"}</div>
                {addr && (
                  <Button size="sm" variant="ghost" className="mt-2 h-7" onClick={() => { navigator.clipboard.writeText(addr); toast.success("Copied"); }}>
                    <Copy className="w-3 h-3 mr-1" />Copy
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

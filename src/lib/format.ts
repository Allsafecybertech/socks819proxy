export const CRYPTO_LABELS: Record<string, string> = {
  BTC: "Bitcoin",
  LTC: "Litecoin",
  USDT_TRC20: "USDT (TRC20)",
  USDT_ERC20: "USDT (ERC20)",
  USDC: "USDC",
};

export const CRYPTO_LIST = ["BTC", "LTC", "USDT_TRC20", "USDT_ERC20", "USDC"] as const;

export function fmtUsd(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

export function statusColor(s: string) {
  switch (s) {
    case "verified":
    case "available":
    case "active":
    case "open":
      return "text-success bg-success/10 border-success/30";
    case "pending_payment":
    case "submitted":
    case "pending":
      return "text-warning bg-warning/10 border-warning/30";
    case "rejected":
    case "expired":
    case "closed":
    case "archived":
      return "text-destructive bg-destructive/10 border-destructive/30";
    default:
      return "text-muted-foreground bg-muted/40 border-border";
  }
}

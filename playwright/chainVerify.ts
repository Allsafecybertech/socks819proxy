// lib/chainVerify.ts
//
// This does NOT auto-approve anything — it just fetches public
// block-explorer data so the admin verification screen can show
// "amount received / confirmations / destination address" next to
// the user's submitted screenshot, instead of you tabbing out to
// check manually every time.

import { CryptoCurrency } from "@prisma/client";

export interface ChainLookupResult {
  found: boolean;
  confirmations?: number;
  amount?: string;
  toAddress?: string;
  raw?: any;
}

export async function lookupTransaction(
  currency: CryptoCurrency,
  txHash: string
): Promise<ChainLookupResult> {
  switch (currency) {
    case "BTC":
      return lookupBlockchair("bitcoin", txHash);
    case "LTC":
      return lookupBlockchair("litecoin", txHash);
    case "USDT":
    case "USDC":
      // Both commonly run as ERC-20/TRC-20 — adjust endpoint to whichever
      // network you actually accept. Example below uses Etherscan for ERC-20.
      return lookupEtherscan(txHash);
    default:
      return { found: false };
  }
}

async function lookupBlockchair(chain: string, txHash: string): Promise<ChainLookupResult> {
  const res = await fetch(`https://api.blockchair.com/${chain}/dashboards/transaction/${txHash}`);
  if (!res.ok) return { found: false };

  const data = await res.json();
  const tx = data?.data?.[txHash];
  if (!tx) return { found: false };

  return {
    found: true,
    confirmations: tx.transaction?.block_id > 0 ? 1 : 0, // Blockchair doesn't give live confirmations directly; refine as needed
    amount: tx.transaction?.output_total_usd,
    raw: tx,
  };
}

async function lookupEtherscan(txHash: string): Promise<ChainLookupResult> {
  const apiKey = process.env.ETHERSCAN_API_KEY!;
  const res = await fetch(
    `https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${apiKey}`
  );
  if (!res.ok) return { found: false };

  const data = await res.json();
  if (data.status !== "1") return { found: false };

  return { found: true, raw: data.result };
}

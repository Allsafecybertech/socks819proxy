// lib/pricing.ts
//
// Converts a plan's USD price into an amount of the chosen crypto,
// so the order screen can show "Send exactly 0.00041 BTC".

import { CryptoCurrency } from "@prisma/client";

const COINGECKO_IDS: Record<CryptoCurrency, string> = {
  BTC: "bitcoin",
  LTC: "litecoin",
  USDT: "tether",
  USDC: "usd-coin",
};

export async function usdToCrypto(amountUsd: number, currency: CryptoCurrency): Promise<number> {
  const id = COINGECKO_IDS[currency];
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    { next: { revalidate: 60 } } // cache 60s, avoid hammering the API
  );

  if (!res.ok) throw new Error(`Price lookup failed for ${currency}`);

  const data = await res.json();
  const rate = data[id]?.usd;
  if (!rate) throw new Error(`No rate returned for ${currency}`);

  // Stablecoins should be ~1:1 but still go through live rate in case of depeg
  const amount = amountUsd / rate;

  // Round sensibly: 8 decimals for BTC/LTC, 2-6 for stablecoins
  const decimals = currency === "BTC" || currency === "LTC" ? 8 : 6;
  return Number(amount.toFixed(decimals));
}

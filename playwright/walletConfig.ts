// lib/walletConfig.ts
//
// Your receiving wallet addresses. Keep these in env vars, never hardcode,
// so you can rotate an address without a redeploy.

import { CryptoCurrency } from "@prisma/client";

export const WALLET_ADDRESSES: Record<CryptoCurrency, string> = {
  USDT: process.env.WALLET_USDT!, // specify network in your UI, e.g. USDT-TRC20 vs ERC20
  BTC: process.env.WALLET_BTC!,
  LTC: process.env.WALLET_LTC!,
  USDC: process.env.WALLET_USDC!,
};

export function getWalletAddress(currency: CryptoCurrency): string {
  const addr = WALLET_ADDRESSES[currency];
  if (!addr) throw new Error(`No wallet address configured for ${currency}`);
  return addr;
}

// app/api/orders/route.ts
//
// POST: user picks a plan + crypto currency -> we create a PENDING_PAYMENT
//       order, quote the crypto amount, and hand back the wallet address.
// GET:  list the logged-in user's orders (this backs the Order History page).

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { getWalletAddress } from "@/lib/walletConfig";
import { usdToCrypto } from "@/lib/pricing";
import { getSessionUser } from "@/lib/auth"; // your existing auth helper

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId, currency } = await req.json();
  if (!planId || !currency) {
    return NextResponse.json({ error: "planId and currency are required" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
  }

  const walletAddress = getWalletAddress(currency);
  const amountCrypto = await usdToCrypto(Number(plan.priceUsd), currency);

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      planId: plan.id,
      currency,
      walletAddress,
      amountUsd: plan.priceUsd,
      amountCrypto,
      status: OrderStatus.PENDING_PAYMENT,
    },
  });

  return NextResponse.json({
    orderId: order.id,
    walletAddress,
    currency,
    amountUsd: plan.priceUsd,
    amountCrypto,
    // Tell the user this is quoted, not locked forever
    note: "Send the exact crypto amount shown. Rate is a live quote — if it's been over 15 minutes, refresh before sending.",
  });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

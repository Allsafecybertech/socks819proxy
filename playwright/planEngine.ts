// lib/planEngine.ts
//
// Core business logic for plans, credits, and proxy visibility.
// Everything that changes what a user is entitled to must go through
// these functions — never mutate Subscription/ProxyAssignment directly
// from an API route.

import { PrismaClient, DurationType, ProxyStatus, OrderStatus, SubscriptionStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// 1. Activate a subscription once an admin verifies a crypto payment
// ---------------------------------------------------------------------------
export async function activateSubscriptionFromOrder(orderId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { plan: true },
    });

    if (order.status !== OrderStatus.SUBMITTED) {
      throw new Error(`Order ${orderId} is not in SUBMITTED state`);
    }

    // Mark order verified
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedByAdmin: adminId,
      },
    });

    const plan = order.plan;
    const now = new Date();

    // Build the subscription based on the plan's duration type
    const subscription = await tx.subscription.create({
      data: {
        userId: order.userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        remainingCredits: plan.durationType === DurationType.CREDIT ? plan.durationValue : null,
        expiresAt:
          plan.durationType === DurationType.TIME
            ? new Date(now.getTime() + (plan.durationValue ?? 30) * 24 * 60 * 60 * 1000)
            : null,
      },
    });

    // Pull proxies from the available pool and assign them
    await allocateProxiesToSubscription(tx, subscription.id, plan.proxyCount);

    return subscription;
  });
}

// ---------------------------------------------------------------------------
// 2. Allocate N available proxies to a subscription (hidden until revealed)
// ---------------------------------------------------------------------------
async function allocateProxiesToSubscription(
  tx: Omit<PrismaClient, "$transaction" | "$connect" | "$disconnect" | "$on" | "$use" | "$extends">,
  subscriptionId: string,
  count: number
) {
  const available = await tx.proxy.findMany({
    where: { status: ProxyStatus.AVAILABLE },
    take: count,
  });

  if (available.length < count) {
    // Not enough stock — surface this loudly. Do NOT silently under-deliver.
    throw new Error(
      `Only ${available.length}/${count} proxies available in pool. Run the Playwright fetcher before allocating.`
    );
  }

  await tx.proxy.updateMany({
    where: { id: { in: available.map((p) => p.id) } },
    data: { status: ProxyStatus.ASSIGNED },
  });

  await tx.proxyAssignment.createMany({
    data: available.map((p) => ({
      subscriptionId,
      proxyId: p.id,
      status: ProxyStatus.ASSIGNED,
    })),
  });
}

// ---------------------------------------------------------------------------
// 3. User clicks "View" on a proxy — this is the reveal + deduct step
// ---------------------------------------------------------------------------
export async function revealProxy(assignmentId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.proxyAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: { subscription: true },
    });

    if (assignment.subscription.userId !== userId) {
      throw new Error("Not your proxy assignment");
    }
    if (assignment.status !== ProxyStatus.ASSIGNED) {
      throw new Error("Proxy already revealed or expired");
    }

    await assertSubscriptionUsable(tx, assignment.subscription.id);

    const now = new Date();
    const revealExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const updated = await tx.proxyAssignment.update({
      where: { id: assignmentId },
      data: {
        status: ProxyStatus.REVEALED,
        revealedAt: now,
        revealExpiresAt,
      },
      include: { proxy: true },
    });

    // Deduct a credit if this is a credit-based plan
    const sub = await tx.subscription.findUniqueOrThrow({
      where: { id: assignment.subscriptionId },
      include: { plan: true },
    });

    if (sub.plan.durationType === DurationType.CREDIT) {
      if ((sub.remainingCredits ?? 0) <= 0) {
        throw new Error("No credits remaining");
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: { remainingCredits: { decrement: 1 } },
      });
    }

    // Return the actual proxy details — this is the ONLY point in the
    // app where raw ip/port/user/pass should ever be sent to the client.
    return updated.proxy;
  });
}

// ---------------------------------------------------------------------------
// 4. Guard: is this subscription still allowed to reveal proxies?
// ---------------------------------------------------------------------------
async function assertSubscriptionUsable(
  tx: Omit<PrismaClient, "$transaction" | "$connect" | "$disconnect" | "$on" | "$use" | "$extends">,
  subscriptionId: string
) {
  const sub = await tx.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (sub.status !== SubscriptionStatus.ACTIVE) {
    throw new Error("Subscription is not active");
  }

  if (sub.plan.durationType === DurationType.TIME && sub.expiresAt && sub.expiresAt < new Date()) {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.EXPIRED },
    });
    throw new Error("Subscription expired");
  }

  if (sub.plan.durationType === DurationType.CREDIT && (sub.remainingCredits ?? 0) <= 0) {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.EXPIRED },
    });
    throw new Error("No credits remaining");
  }
  // LIFETIME plans always pass through
}

// ---------------------------------------------------------------------------
// 5. Sweep job — run every few minutes via cron/queue
//    a) expire 24h-revealed proxies
//    b) expire TIME subscriptions past their date
//    c) recycle expired proxies back into the pool
// ---------------------------------------------------------------------------
export async function runExpirySweep() {
  const now = new Date();

  // a) Revealed proxies past 24h -> EXPIRED, recycle the underlying proxy
  const expiredReveals = await prisma.proxyAssignment.findMany({
    where: { status: ProxyStatus.REVEALED, revealExpiresAt: { lt: now } },
  });

  for (const a of expiredReveals) {
    await prisma.$transaction([
      prisma.proxyAssignment.update({
        where: { id: a.id },
        data: { status: ProxyStatus.EXPIRED },
      }),
      prisma.proxy.update({
        where: { id: a.proxyId },
        data: { status: ProxyStatus.RECYCLED },
      }),
    ]);
  }

  // b) TIME subscriptions past expiry -> EXPIRED
  await prisma.subscription.updateMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      expiresAt: { lt: now },
    },
    data: { status: SubscriptionStatus.EXPIRED },
  });

  return { expiredReveals: expiredReveals.length };
}

// ---------------------------------------------------------------------------
// 6. What the user's "My Proxies" page should query
//    - assigned = hidden rows (just a count/placeholder, no ip/pass)
//    - revealed = full detail, goes on the "24h Proxy List" page
// ---------------------------------------------------------------------------
export async function getUserProxyView(userId: string) {
  const assignments = await prisma.proxyAssignment.findMany({
    where: { subscription: { userId } },
    include: { proxy: true, subscription: { include: { plan: true } } },
    orderBy: { assignedAt: "desc" },
  });

  const hidden = assignments
    .filter((a) => a.status === ProxyStatus.ASSIGNED)
    .map((a) => ({ id: a.id, planName: a.subscription.plan.name })); // no ip/port/pass here

  const revealed = assignments
    .filter((a) => a.status === ProxyStatus.REVEALED)
    .map((a) => ({
      id: a.id,
      ip: a.proxy.ip,
      port: a.proxy.port,
      username: a.proxy.username,
      password: a.proxy.password,
      revealedAt: a.revealedAt,
      expiresAt: a.revealExpiresAt,
    }));

  return { hidden, revealed };
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { formatPendingCountdown } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const [pendingClaims, transactions] = await Promise.all([
    prisma.taskClaim.findMany({
      where: {
        userId: user.id,
        creditedAt: null,
        pendingUntil: {
          gt: now,
        },
      },
      orderBy: {
        pendingUntil: "asc",
      },
      take: 30,
      select: {
        id: true,
        taskKey: true,
        payoutCents: true,
        offerwallName: true,
        offerId: true,
        offerTitle: true,
        pendingUntil: true,
        claimedAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        amountCents: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  const pendingTotalCents = pendingClaims.reduce((sum, claim) => sum + claim.payoutCents, 0);
  const requiresEmailVerification = !Boolean(user.emailVerifiedAt);

  return NextResponse.json({
    requiresEmailVerification,
    pendingTotalCents,
    pendingClaims: pendingClaims.map((claim) => ({
      id: claim.id,
      offerName: claim.offerTitle ?? claim.offerId ?? claim.taskKey,
      offerwallName: claim.offerwallName,
      offerId: claim.offerId,
      payoutCents: claim.payoutCents,
      pendingUntil: claim.pendingUntil?.toISOString() ?? null,
      claimedAt: claim.claimedAt.toISOString(),
      timeLeft: claim.pendingUntil ? formatPendingCountdown(claim.pendingUntil, now) : "Pending review",
    })),
    transactions: transactions.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amountCents: entry.amountCents,
      description: entry.description,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}

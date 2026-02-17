import { formatUSD } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const MID_TIER_PENDING_MIN_CENTS = 300;
const MID_TIER_PENDING_MAX_CENTS = 700;
const MID_TIER_PENDING_DAYS = 14;
const HIGH_TIER_PENDING_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type PendingCountdown = {
  totalHours: number;
  days: number;
  hours: number;
};

export function getOfferPendingDays(payoutCents: number): number {
  if (payoutCents > MID_TIER_PENDING_MAX_CENTS) {
    return HIGH_TIER_PENDING_DAYS;
  }

  if (payoutCents > MID_TIER_PENDING_MIN_CENTS) {
    return MID_TIER_PENDING_DAYS;
  }

  return 0;
}

export function getPendingUntil(payoutCents: number, now = new Date()): Date | null {
  const pendingDays = getOfferPendingDays(payoutCents);
  if (pendingDays <= 0) {
    return null;
  }

  return new Date(now.getTime() + pendingDays * DAY_MS);
}

export function formatPendingDurationLabel(pendingDays: number): string {
  if (pendingDays <= 0) {
    return "Instant";
  }

  return `${pendingDays} day${pendingDays === 1 ? "" : "s"}`;
}

export function getPendingCountdown(pendingUntil: Date, now = new Date()): PendingCountdown {
  const remainingMs = Math.max(0, pendingUntil.getTime() - now.getTime());
  const totalHours = Math.ceil(remainingMs / HOUR_MS);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return {
    totalHours,
    days,
    hours,
  };
}

export function formatPendingCountdown(pendingUntil: Date, now = new Date()): string {
  const countdown = getPendingCountdown(pendingUntil, now);
  if (countdown.totalHours <= 0) {
    return "Releasing now";
  }

  return `${countdown.days}d ${countdown.hours}h left`;
}

export type ReleasePendingResult = {
  releasedCount: number;
  releasedCents: number;
};

export async function releaseMaturedPendingOfferCredits(userId: string): Promise<ReleasePendingResult> {
  const now = new Date();

  const maturedClaims = await prisma.taskClaim.findMany({
    where: {
      userId,
      creditedAt: null,
      pendingUntil: {
        lte: now,
      },
    },
    orderBy: {
      pendingUntil: "asc",
    },
    select: {
      id: true,
      payoutCents: true,
      offerTitle: true,
      offerwallName: true,
      taskKey: true,
    },
  });

  if (maturedClaims.length === 0) {
    return {
      releasedCount: 0,
      releasedCents: 0,
    };
  }

  return prisma.$transaction(async (tx) => {
    let releasedCount = 0;
    let releasedCents = 0;

    for (const claim of maturedClaims) {
      const claimUpdated = await tx.taskClaim.updateMany({
        where: {
          id: claim.id,
          creditedAt: null,
        },
        data: {
          creditedAt: now,
        },
      });

      if (claimUpdated.count !== 1) {
        continue;
      }

      releasedCount += 1;
      releasedCents += claim.payoutCents;

      const sourceName = claim.offerTitle ?? claim.taskKey;
      await tx.transaction.create({
        data: {
          userId,
          type: "EARN_RELEASE",
          amountCents: claim.payoutCents,
          description: `Pending offer released from ${claim.offerwallName}: ${sourceName}`,
        },
      });
    }

    if (releasedCents > 0) {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          balanceCents: {
            increment: releasedCents,
          },
          lifetimeEarnedCents: {
            increment: releasedCents,
          },
        },
      });
    }

    return {
      releasedCount,
      releasedCents,
    };
  });
}

export function buildPendingEarnNotice(payoutCents: number, pendingDays: number): string {
  return `Offer completed: ${formatUSD(payoutCents)} is pending for ${pendingDays} days for fraud checks.`;
}

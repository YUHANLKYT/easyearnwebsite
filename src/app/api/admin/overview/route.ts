import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRedemptionLabel, VIP_PLUS_UNLOCK_LEVEL, type PayoutCurrency } from "@/lib/constants";
import { getLevelFromLifetimeEarnings } from "@/lib/gamification";
import { formatUSD } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    offers,
    withdrawals,
    customWithdrawals,
    complaints,
    users,
    pendingWithdrawals,
    pendingCustomWithdrawals,
    openComplaints,
    mutedUsers,
    terminatedUsers,
  ] =
    await Promise.all([
      prisma.taskClaim.findMany({
        orderBy: {
          claimedAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: 30,
      }),
      prisma.redemption.findMany({
        where: {
          method: {
            not: "CUSTOM_WITHDRAWAL",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              lifetimeEarnedCents: true,
            },
          },
        },
        take: 40,
      }),
      prisma.redemption.findMany({
        where: {
          method: "CUSTOM_WITHDRAWAL",
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              lifetimeEarnedCents: true,
            },
          },
        },
        take: 40,
      }),
      prisma.complaint.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: 40,
      }),
      prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          balanceCents: true,
          createdAt: true,
        },
        take: 40,
      }),
      prisma.redemption.count({
        where: {
          status: "PENDING",
          method: {
            not: "CUSTOM_WITHDRAWAL",
          },
        },
      }),
      prisma.redemption.count({
        where: {
          status: "PENDING",
          method: "CUSTOM_WITHDRAWAL",
        },
      }),
      prisma.complaint.count({
        where: {
          status: "OPEN",
        },
      }),
      prisma.user.count({
        where: {
          status: "MUTED",
        },
      }),
      prisma.user.count({
        where: {
          status: "TERMINATED",
        },
      }),
    ]);

  const prioritizedWithdrawals = [...withdrawals].sort((left, right) => {
    const leftPriority = getLevelFromLifetimeEarnings(left.user.lifetimeEarnedCents) >= VIP_PLUS_UNLOCK_LEVEL ? 1 : 0;
    const rightPriority = getLevelFromLifetimeEarnings(right.user.lifetimeEarnedCents) >= VIP_PLUS_UNLOCK_LEVEL ? 1 : 0;
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }
    return right.createdAt.getTime() - left.createdAt.getTime();
  });
  const activeWithdrawals = prioritizedWithdrawals.filter(
    (withdrawal) => withdrawal.status === "PENDING" || withdrawal.status === "APPROVED",
  );
  const withdrawalHistory = prioritizedWithdrawals
    .filter((withdrawal) => withdrawal.status === "SENT" || withdrawal.status === "CANCELED")
    .sort((left, right) => {
      const leftTime = left.processedAt?.getTime() ?? left.createdAt.getTime();
      const rightTime = right.processedAt?.getTime() ?? right.createdAt.getTime();
      return rightTime - leftTime;
    });

  function formatPayoutCurrency(cents: number | null, currency: PayoutCurrency): string | null {
    if (cents === null) {
      return null;
    }
    const locale = currency === "AUD" ? "en-AU" : currency === "GBP" ? "en-GB" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  return NextResponse.json({
    metrics: {
      pendingWithdrawals,
      pendingCustomWithdrawals,
      openComplaints,
      mutedUsers,
      terminatedUsers,
    },
    offers: offers.map((offer) => ({
      id: offer.id,
      userName: offer.user.name,
      userEmail: offer.user.email,
      offerTitle: offer.offerTitle,
      offerwallName: offer.offerwallName,
      offerId: offer.offerId,
      taskKey: offer.taskKey,
      payoutCents: offer.payoutCents,
      status: offer.creditedAt ? "PAID" : "PENDING",
      pendingUntil: offer.pendingUntil ? offer.pendingUntil.toISOString() : null,
      creditedAt: offer.creditedAt ? offer.creditedAt.toISOString() : null,
      claimedAt: offer.claimedAt.toISOString(),
    })),
    withdrawals: activeWithdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      userName: withdrawal.user.name,
      userEmail: withdrawal.user.email,
      userLevel: getLevelFromLifetimeEarnings(withdrawal.user.lifetimeEarnedCents),
      priorityQueue: getLevelFromLifetimeEarnings(withdrawal.user.lifetimeEarnedCents) >= VIP_PLUS_UNLOCK_LEVEL,
      method: withdrawal.method,
      methodLabel: getRedemptionLabel(withdrawal.method),
      amountCents: withdrawal.amountCents,
      amountLabel: formatUSD(withdrawal.amountCents),
      payoutRegion: withdrawal.payoutRegion,
      payoutCurrency: withdrawal.payoutCurrency,
      faceValueCents: withdrawal.faceValueCents,
      faceValueLabel: formatPayoutCurrency(withdrawal.faceValueCents, withdrawal.payoutCurrency),
      status: withdrawal.status,
      payoutEmail: withdrawal.payoutEmail,
      discordUsername: withdrawal.discordUsername,
      deliveryCode: withdrawal.note,
      cancelReason: withdrawal.customDeclineReason,
      history: false,
      createdAt: withdrawal.createdAt.toISOString(),
      processedAt: withdrawal.processedAt ? withdrawal.processedAt.toISOString() : null,
    })),
    withdrawalHistory: withdrawalHistory.map((withdrawal) => ({
      id: withdrawal.id,
      userName: withdrawal.user.name,
      userEmail: withdrawal.user.email,
      userLevel: getLevelFromLifetimeEarnings(withdrawal.user.lifetimeEarnedCents),
      priorityQueue: getLevelFromLifetimeEarnings(withdrawal.user.lifetimeEarnedCents) >= VIP_PLUS_UNLOCK_LEVEL,
      method: withdrawal.method,
      methodLabel: getRedemptionLabel(withdrawal.method),
      amountCents: withdrawal.amountCents,
      amountLabel: formatUSD(withdrawal.amountCents),
      payoutRegion: withdrawal.payoutRegion,
      payoutCurrency: withdrawal.payoutCurrency,
      faceValueCents: withdrawal.faceValueCents,
      faceValueLabel: formatPayoutCurrency(withdrawal.faceValueCents, withdrawal.payoutCurrency),
      status: withdrawal.status,
      payoutEmail: withdrawal.payoutEmail,
      discordUsername: withdrawal.discordUsername,
      deliveryCode: withdrawal.note,
      cancelReason: withdrawal.customDeclineReason,
      history: true,
      createdAt: withdrawal.createdAt.toISOString(),
      processedAt: withdrawal.processedAt ? withdrawal.processedAt.toISOString() : null,
    })),
    customWithdrawals: customWithdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      userName: withdrawal.user.name,
      userEmail: withdrawal.user.email,
      userLevel: getLevelFromLifetimeEarnings(withdrawal.user.lifetimeEarnedCents),
      priorityQueue: getLevelFromLifetimeEarnings(withdrawal.user.lifetimeEarnedCents) >= VIP_PLUS_UNLOCK_LEVEL,
      amountCents: withdrawal.amountCents,
      amountLabel: formatUSD(withdrawal.amountCents),
      status: withdrawal.status,
      customName: withdrawal.customName,
      customDestination: withdrawal.customDestination,
      customDeclineReason: withdrawal.customDeclineReason,
      customFulfillment: withdrawal.customFulfillment,
      createdAt: withdrawal.createdAt.toISOString(),
      processedAt: withdrawal.processedAt ? withdrawal.processedAt.toISOString() : null,
    })),
    complaints: complaints.map((complaint) => ({
      id: complaint.id,
      userName: complaint.user.name,
      userEmail: complaint.user.email,
      subject: complaint.subject,
      message: complaint.message,
      status: complaint.status,
      createdAt: complaint.createdAt.toISOString(),
    })),
    users: users.map((listedUser) => ({
      ...listedUser,
      createdAt: listedUser.createdAt.toISOString(),
    })),
  });
}

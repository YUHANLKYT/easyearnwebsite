import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getStreakSnapshotFromClaims, getUserStreakSnapshot, spinStreakCaseSegment } from "@/lib/streaks";
import { prisma } from "@/lib/prisma";

type OpenStreakCasePayload = {
  tier?: number;
};

function isStreakTier(value: number): value is 7 | 14 {
  return value === 7 || value === 14;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account is not active." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as OpenStreakCasePayload | null;
  const tierValue = Number(payload?.tier);
  if (!Number.isFinite(tierValue) || !isStreakTier(tierValue)) {
    return NextResponse.json({ error: "Choose a valid streak case tier." }, { status: 400 });
  }

  const tier = tierValue;
  const reward = spinStreakCaseSegment(tier);
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const latestUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!latestUser) {
        throw new Error("USER_NOT_FOUND");
      }

      if (latestUser.status !== "ACTIVE") {
        throw new Error("ACCOUNT_RESTRICTED");
      }

      const claims = await tx.taskClaim.findMany({
        where: {
          userId: latestUser.id,
          claimedAt: {
            gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 400)),
          },
        },
        select: {
          claimedAt: true,
          payoutCents: true,
        },
      });

      const provisionalSnapshot = getStreakSnapshotFromClaims(claims, null, false, false, now);
      if (!provisionalSnapshot.streakStartDay) {
        throw new Error("NO_ACTIVE_STREAK");
      }

      const existingForStreak = await tx.streakCaseOpen.findMany({
        where: {
          userId: latestUser.id,
          streakStartDay: provisionalSnapshot.streakStartDay,
          tier: {
            in: [7, 14],
          },
        },
        select: {
          tier: true,
        },
      });

      const confirmedSnapshot = getStreakSnapshotFromClaims(
        claims,
        provisionalSnapshot.streakStartDay,
        existingForStreak.some((entry) => entry.tier === 7),
        existingForStreak.some((entry) => entry.tier === 14),
        now,
      );

      const canOpen = tier === 7 ? confirmedSnapshot.availableCase7 : confirmedSnapshot.availableCase14;
      if (!canOpen) {
        throw new Error("CASE_NOT_AVAILABLE");
      }

      const streakStartDay = confirmedSnapshot.streakStartDay;
      if (!streakStartDay) {
        throw new Error("NO_ACTIVE_STREAK");
      }

      await tx.streakCaseOpen.create({
        data: {
          userId: latestUser.id,
          tier,
          streakStartDay,
          streakDaysAtOpen: confirmedSnapshot.streakDays,
          amountCents: reward.amountCents,
          createdAt: now,
        },
      });

      await tx.user.update({
        where: {
          id: latestUser.id,
        },
        data: {
          balanceCents: {
            increment: reward.amountCents,
          },
          lifetimeEarnedCents: {
            increment: reward.amountCents,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: latestUser.id,
          type: "STREAK_CASE",
          amountCents: reward.amountCents,
          description: `${tier}-Day Streak Case reward (${reward.label})`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "ACCOUNT_RESTRICTED") {
      return NextResponse.json({ error: "Account is not active." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NO_ACTIVE_STREAK") {
      return NextResponse.json({ error: "No active streak yet. Complete daily offers to start one." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "CASE_NOT_AVAILABLE") {
      return NextResponse.json({ error: "This streak case is not available yet." }, { status: 400 });
    }

    return NextResponse.json({ error: "Could not open streak case." }, { status: 500 });
  }

  const updatedSnapshot = await getUserStreakSnapshot(user.id, now);

  return NextResponse.json({
    ok: true,
    reward: {
      id: reward.id,
      label: reward.label,
      amountCents: reward.amountCents,
      colorClass: reward.colorClass,
    },
    streak: {
      streakDays: updatedSnapshot.streakDays,
      todayEarnedCents: updatedSnapshot.todayEarnedCents,
      remainingTodayCents: updatedSnapshot.remainingTodayCents,
      todayQualified: updatedSnapshot.todayQualified,
      canKeepToday: updatedSnapshot.canKeepToday,
      availableCase7: updatedSnapshot.availableCase7,
      availableCase14: updatedSnapshot.availableCase14,
      claimedCase7: updatedSnapshot.claimedCase7,
      claimedCase14: updatedSnapshot.claimedCase14,
      nextMilestone: updatedSnapshot.nextMilestone,
      daysToNextMilestone: updatedSnapshot.daysToNextMilestone,
    },
  });
}

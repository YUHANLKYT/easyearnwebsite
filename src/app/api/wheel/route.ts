import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { REQUIRED_ACTIVE_REFERRALS_FOR_WHEEL, WHEEL_COOLDOWN_HOURS } from "@/lib/constants";
import { canSpinWheel, getActiveReferralWindowStart, spinWheelSegment } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        adminTest?: boolean;
      }
    | null;
  const adminTestMode = Boolean(payload?.adminTest && user.role === "ADMIN");

  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Muted or terminated accounts cannot open the referral case." },
      { status: 403 },
    );
  }

  if (!adminTestMode) {
    const activeWindowStart = getActiveReferralWindowStart();
    const activeReferralCount = await prisma.user.count({
      where: {
        referredById: user.id,
        lastWithdrawalAt: {
          gte: activeWindowStart,
        },
      },
    });

    if (!canSpinWheel(activeReferralCount)) {
      return NextResponse.json(
        { error: `You need ${REQUIRED_ACTIVE_REFERRALS_FOR_WHEEL} active referrals to open this case.` },
        { status: 403 },
      );
    }
  }

  const latestUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      wheelLastSpunAt: true,
      balanceCents: true,
    },
  });

  if (!latestUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const now = new Date();
  if (!adminTestMode) {
    if (latestUser.wheelLastSpunAt) {
      const nextSpinAt = new Date(latestUser.wheelLastSpunAt.getTime() + WHEEL_COOLDOWN_HOURS * 60 * 60 * 1000);
      if (nextSpinAt > now) {
        return NextResponse.json(
          { error: "Case cooldown is still active.", nextAvailableAt: nextSpinAt.toISOString() },
          { status: 429 },
        );
      }
    }
  }

  const reward = spinWheelSegment();
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        balanceCents: {
          increment: reward.amountCents,
        },
        lifetimeEarnedCents: {
          increment: reward.amountCents,
        },
        ...(adminTestMode ? {} : { wheelLastSpunAt: now }),
      },
      select: {
        balanceCents: true,
      },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "WHEEL_SPIN",
        amountCents: reward.amountCents,
        description: adminTestMode
          ? `Admin test case opening reward (${reward.label})`
          : `Referral case opening reward (${reward.label})`,
      },
    });

    return updated;
  });

  const nextAvailableAt = adminTestMode
    ? null
    : new Date(now.getTime() + WHEEL_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

  return NextResponse.json({
    reward: {
      id: reward.id,
      label: reward.label,
      amountCents: reward.amountCents,
      colorClass: reward.colorClass,
    },
    balanceCents: updatedUser.balanceCents,
    nextAvailableAt,
  });
}

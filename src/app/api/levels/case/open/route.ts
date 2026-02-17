import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getLevelFromLifetimeEarnings, spinLevelCaseSegment } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reward = spinLevelCaseSegment();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const latestUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          status: true,
          lifetimeEarnedCents: true,
          levelCaseKeys: true,
        },
      });

      if (!latestUser) {
        throw new Error("USER_NOT_FOUND");
      }

      if (latestUser.status !== "ACTIVE") {
        throw new Error("ACCOUNT_RESTRICTED");
      }

      if (latestUser.levelCaseKeys < 1) {
        throw new Error("NO_KEYS");
      }

      const levelAtOpen = getLevelFromLifetimeEarnings(latestUser.lifetimeEarnedCents);

      const updatedUser = await tx.user.update({
        where: {
          id: latestUser.id,
        },
        data: {
          levelCaseKeys: {
            decrement: 1,
          },
          balanceCents: {
            increment: reward.amountCents,
          },
          lifetimeEarnedCents: {
            increment: reward.amountCents,
          },
        },
        select: {
          levelCaseKeys: true,
          lifetimeEarnedCents: true,
        },
      });

      await tx.levelCaseOpen.create({
        data: {
          userId: latestUser.id,
          amountCents: reward.amountCents,
          levelAtOpen,
        },
      });

      await tx.transaction.create({
        data: {
          userId: latestUser.id,
          type: "LEVEL_CASE",
          amountCents: reward.amountCents,
          description: `Level-Up Case reward (${reward.label})`,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      ok: true,
      reward: {
        id: reward.id,
        label: reward.label,
        amountCents: reward.amountCents,
        colorClass: reward.colorClass,
      },
      availableKeys: result.levelCaseKeys,
      newLevel: getLevelFromLifetimeEarnings(result.lifetimeEarnedCents),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "ACCOUNT_RESTRICTED") {
      return NextResponse.json({ error: "Account is not active." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NO_KEYS") {
      return NextResponse.json({ error: "No Level-Up Case keys available." }, { status: 400 });
    }

    return NextResponse.json({ error: "Could not open level case." }, { status: 500 });
  }
}

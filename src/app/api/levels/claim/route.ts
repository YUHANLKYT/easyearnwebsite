import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getLevelFromLifetimeEarnings, getTotalLevelCaseKeysEarned } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Muted or terminated accounts cannot claim level rewards." }, { status: 403 });
  }

  const latestUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      status: true,
      lifetimeEarnedCents: true,
      levelRewardsClaimed: true,
      levelCaseKeys: true,
    },
  });

  if (!latestUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (latestUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account is not active." }, { status: 403 });
  }

  const currentLevel = getLevelFromLifetimeEarnings(latestUser.lifetimeEarnedCents);
  const alreadyClaimedLevel = Math.max(0, latestUser.levelRewardsClaimed);
  if (currentLevel <= alreadyClaimedLevel) {
    return NextResponse.json({ error: "No unclaimed level rewards yet." }, { status: 400 });
  }

  const keysToAdd = Math.max(
    0,
    getTotalLevelCaseKeysEarned(currentLevel) - getTotalLevelCaseKeysEarned(alreadyClaimedLevel),
  );

  const updated = await prisma.user.update({
    where: {
      id: latestUser.id,
    },
    data: {
      levelRewardsClaimed: currentLevel,
      levelCaseKeys: {
        increment: keysToAdd,
      },
    },
    select: {
      levelCaseKeys: true,
      levelRewardsClaimed: true,
    },
  });

  return NextResponse.json({
    ok: true,
    claimedLevels: currentLevel - alreadyClaimedLevel,
    keysAdded: keysToAdd,
    availableKeys: updated.levelCaseKeys,
    claimedUpToLevel: updated.levelRewardsClaimed,
  });
}

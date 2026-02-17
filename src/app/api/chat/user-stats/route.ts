import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getActiveReferralWindowStart, getLevelFromLifetimeEarnings } from "@/lib/gamification";
import { formatUSD } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  const activeWindowStart = getActiveReferralWindowStart();
  const selectedUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      anonymousMode: true,
      role: true,
      status: true,
      balanceCents: true,
      lifetimeEarnedCents: true,
      totalWithdrawnCents: true,
      createdAt: true,
      _count: {
        select: {
          referrals: true,
          chatMessages: true,
        },
      },
    },
  });

  if (!selectedUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const activeReferrals = await prisma.user.count({
    where: {
      referredById: selectedUser.id,
      lastWithdrawalAt: {
        gte: activeWindowStart,
      },
    },
  });

  const level = getLevelFromLifetimeEarnings(selectedUser.lifetimeEarnedCents);
  const hidePublicDetails = selectedUser.anonymousMode && viewer.role !== "ADMIN" && viewer.id !== selectedUser.id;

  return NextResponse.json({
    profile: {
      id: selectedUser.id,
      name: hidePublicDetails ? "Hidden" : selectedUser.name,
      role: selectedUser.role,
      status: selectedUser.status,
      level,
      isAnonymous: hidePublicDetails,
      balance: hidePublicDetails ? null : formatUSD(selectedUser.balanceCents),
      lifetimeEarned: hidePublicDetails ? null : formatUSD(selectedUser.lifetimeEarnedCents),
      totalWithdrawn: hidePublicDetails ? null : formatUSD(selectedUser.totalWithdrawnCents),
      totalReferrals: hidePublicDetails ? null : selectedUser._count.referrals,
      activeReferrals: hidePublicDetails ? null : activeReferrals,
      chatMessages: hidePublicDetails ? null : selectedUser._count.chatMessages,
      joinedAt: hidePublicDetails ? null : selectedUser.createdAt.toISOString(),
    },
  });
}

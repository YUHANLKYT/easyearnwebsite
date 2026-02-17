import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getLevelFromLifetimeEarnings } from "@/lib/gamification";
import { formatPendingCountdown } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseQuery(value: string | null): string {
  return value?.trim() ?? "";
}

export async function GET(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = parseQuery(url.searchParams.get("query"));
  const userId = parseQuery(url.searchParams.get("userId"));
  const now = new Date();

  if (!query && !userId) {
    return NextResponse.json({
      matches: [],
      user: null,
      offerClaims: [],
      transactions: [],
    });
  }

  const matches = query
    ? await prisma.user.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
              },
            },
            {
              email: {
                contains: query,
              },
            },
            {
              referralCode: {
                contains: query,
              },
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          name: true,
          email: true,
          referralCode: true,
          status: true,
          role: true,
          balanceCents: true,
          lifetimeEarnedCents: true,
          totalWithdrawnCents: true,
          createdAt: true,
        },
      })
    : [];

  const selectedId = userId || matches[0]?.id;
  if (!selectedId) {
    return NextResponse.json({
      matches: matches.map((match) => ({
        ...match,
        level: getLevelFromLifetimeEarnings(match.lifetimeEarnedCents),
        createdAt: match.createdAt.toISOString(),
      })),
      user: null,
      offerClaims: [],
      transactions: [],
    });
  }

  const [selectedUser, claims, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: selectedId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        status: true,
        role: true,
        balanceCents: true,
        lifetimeEarnedCents: true,
        totalWithdrawnCents: true,
        createdAt: true,
      },
    }),
    prisma.taskClaim.findMany({
      where: {
        userId: selectedId,
      },
      orderBy: {
        claimedAt: "desc",
      },
      select: {
        id: true,
        taskKey: true,
        offerwallName: true,
        offerId: true,
        offerTitle: true,
        payoutCents: true,
        pendingUntil: true,
        creditedAt: true,
        claimedAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId: selectedId,
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

  const normalizedMatches = matches.map((match) => ({
    ...match,
    level: getLevelFromLifetimeEarnings(match.lifetimeEarnedCents),
    createdAt: match.createdAt.toISOString(),
  }));

  if (!selectedUser) {
    return NextResponse.json({
      matches: normalizedMatches,
      user: null,
      offerClaims: [],
      transactions: [],
    });
  }

  return NextResponse.json({
    matches: normalizedMatches,
    user: {
      ...selectedUser,
      level: getLevelFromLifetimeEarnings(selectedUser.lifetimeEarnedCents),
      createdAt: selectedUser.createdAt.toISOString(),
    },
    offerClaims: claims.map((claim) => {
      const isPending = Boolean(claim.pendingUntil && !claim.creditedAt && claim.pendingUntil > now);
      return {
        id: claim.id,
        taskKey: claim.taskKey,
        offerwallName: claim.offerwallName,
        offerId: claim.offerId,
        offerTitle: claim.offerTitle,
        payoutCents: claim.payoutCents,
        claimedAt: claim.claimedAt.toISOString(),
        pendingUntil: claim.pendingUntil ? claim.pendingUntil.toISOString() : null,
        creditedAt: claim.creditedAt ? claim.creditedAt.toISOString() : null,
        status: isPending ? "PENDING" : claim.creditedAt ? "PAID" : "PROCESSING",
        timeLeft: isPending && claim.pendingUntil ? formatPendingCountdown(claim.pendingUntil, now) : null,
      };
    }),
    transactions: transactions.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}

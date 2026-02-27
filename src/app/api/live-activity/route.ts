import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskDisplayName } from "@/lib/users";

export const dynamic = "force-dynamic";

type LiveCategory =
  | "offer-complete"
  | "withdrawal-request"
  | "offer-chargeback"
  | "case-reward"
  | "referral-bonus";

const LIVE_ACTIVITY_RESET_AT = (() => {
  const configured = process.env.LIVE_ACTIVITY_RESET_AT?.trim();
  if (configured) {
    const parsed = new Date(configured);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Hard reset point: only events after this time will appear in live activity.
  return new Date("2026-02-26T11:50:18.291Z");
})();

function classifyLiveTransaction(transaction: {
  type: string;
  amountCents: number;
  description: string;
}): LiveCategory | null {
  if (
    transaction.type === "EARN_PENDING" &&
    transaction.amountCents > 0 &&
    /referral sign-up bonus/i.test(transaction.description)
  ) {
    return "referral-bonus";
  }

  if (transaction.type === "WITHDRAWAL") {
    return "withdrawal-request";
  }

  if (transaction.type === "LEVEL_CASE" || transaction.type === "STREAK_CASE" || transaction.type === "WHEEL_SPIN") {
    return "case-reward";
  }

  if (transaction.type === "EARN" && transaction.amountCents < 0) {
    return "offer-chargeback";
  }

  if (
    transaction.type === "EARN_PENDING" &&
    transaction.amountCents <= 0 &&
    /pending reward canceled|chargeback|reversal|reversed|declined|fraud|revoked|cancel/i.test(transaction.description)
  ) {
    return "offer-chargeback";
  }

  if (transaction.type === "EARN_PENDING" && transaction.amountCents > 0) {
    return "offer-complete";
  }

  if (transaction.type === "EARN" && transaction.amountCents > 0) {
    return "offer-complete";
  }

  return null;
}

function getLiveDescription(category: LiveCategory, fallbackDescription: string): string {
  if (category === "referral-bonus") {
    return "Referral bonus";
  }
  if (category === "offer-complete") {
    return "Offer completed";
  }
  if (category === "withdrawal-request") {
    return "Withdrawal request";
  }
  if (category === "offer-chargeback") {
    return "Offer chargeback";
  }
  return fallbackDescription;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 120,
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const filteredTransactions = transactions
    .filter((transaction) => transaction.createdAt >= LIVE_ACTIVITY_RESET_AT)
    .map((transaction) => {
      const category = classifyLiveTransaction(transaction);
      if (!category) {
        return null;
      }
      return {
        ...transaction,
        category,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .slice(0, 20);

  return NextResponse.json({
    items: filteredTransactions.map((transaction) => ({
      id: transaction.id,
      userName: maskDisplayName(transaction.user.name),
      type: transaction.type,
      amountCents: transaction.amountCents,
      description: getLiveDescription(transaction.category, transaction.description),
      createdAt: transaction.createdAt.toISOString(),
    })),
  });
}

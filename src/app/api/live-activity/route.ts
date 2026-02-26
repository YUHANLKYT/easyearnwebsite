import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskDisplayName } from "@/lib/users";

export const dynamic = "force-dynamic";

type LiveCategory = "offer-complete" | "withdrawal-request" | "offer-chargeback" | "case-reward";

function classifyLiveTransaction(transaction: {
  type: string;
  amountCents: number;
  description: string;
}): LiveCategory | null {
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

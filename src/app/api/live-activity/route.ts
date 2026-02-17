import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskDisplayName } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  function getLiveDescription(type: string, description: string): string {
    if (type === "EARN_PENDING") {
      return "Offer completed";
    }
    return description;
  }

  return NextResponse.json({
    items: transactions.map((transaction) => ({
      id: transaction.id,
      userName: maskDisplayName(transaction.user.name),
      type: transaction.type,
      amountCents: transaction.amountCents,
      description: getLiveDescription(transaction.type, transaction.description),
      createdAt: transaction.createdAt.toISOString(),
    })),
  });
}

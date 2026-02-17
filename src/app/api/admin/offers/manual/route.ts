import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { parseDollarInputToCents } from "@/lib/money";
import { buildPendingEarnNotice, getOfferPendingDays, getPendingUntil } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";
import { adminManualOfferSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        userId?: string;
        offerwallName?: string;
        offerId?: string;
        offerTitle?: string;
        amount?: string;
      }
    | null;

  const parsed = adminManualOfferSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter user, offerwall, offer title, and amount." }, { status: 400 });
  }

  const amountCents = parseDollarInputToCents(parsed.data.amount);
  if (amountCents === null || amountCents < 1) {
    return NextResponse.json({ error: "Enter a valid USD amount." }, { status: 400 });
  }
  if (amountCents > 100_000) {
    return NextResponse.json({ error: "Manual offer amount is too large." }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: parsed.data.userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Target user not found." }, { status: 404 });
  }

  if (targetUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "Target user account must be active." }, { status: 400 });
  }

  const now = new Date();
  const pendingDays = getOfferPendingDays(amountCents);
  const pendingUntil = getPendingUntil(amountCents, now);
  const normalizedOfferId = parsed.data.offerId?.trim() || `ADMIN-${Date.now()}`;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.taskClaim.create({
        data: {
          userId: targetUser.id,
          taskKey: "manual-admin-offer",
          offerwallName: parsed.data.offerwallName.trim(),
          offerId: normalizedOfferId,
          offerTitle: parsed.data.offerTitle.trim(),
          payoutCents: amountCents,
          pendingUntil,
          claimedAt: now,
          creditedAt: pendingDays > 0 ? null : now,
        },
      });

      if (pendingDays > 0) {
        await tx.transaction.create({
          data: {
            userId: targetUser.id,
            type: "EARN_PENDING",
            amountCents,
            description: `${buildPendingEarnNotice(amountCents, pendingDays)} (${parsed.data.offerwallName}: ${parsed.data.offerTitle})`,
          },
        });
        return;
      }

      await tx.user.update({
        where: {
          id: targetUser.id,
        },
        data: {
          balanceCents: {
            increment: amountCents,
          },
          lifetimeEarnedCents: {
            increment: amountCents,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: targetUser.id,
          type: "EARN",
          amountCents,
          description: `Manual offer credit from ${parsed.data.offerwallName}: ${parsed.data.offerTitle}`,
        },
      });
    });
  } catch {
    return NextResponse.json({ error: "Could not create manual offer credit." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    amountCents,
    pending: pendingDays > 0,
    pendingDays,
    offerId: normalizedOfferId,
  });
}

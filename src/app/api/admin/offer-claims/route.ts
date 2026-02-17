import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OfferClaimAction = "release";

function isAction(value: string): value is OfferClaimAction {
  return value === "release";
}

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        action?: string;
        claimId?: string;
      }
    | null;

  if (!payload?.action || !payload.claimId || !isAction(payload.action)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.taskClaim.findUnique({
        where: {
          id: payload.claimId,
        },
        select: {
          id: true,
          userId: true,
          payoutCents: true,
          creditedAt: true,
          offerwallName: true,
          offerTitle: true,
          taskKey: true,
        },
      });

      if (!claim) {
        throw new Error("CLAIM_NOT_FOUND");
      }

      if (claim.creditedAt) {
        throw new Error("ALREADY_RELEASED");
      }

      const now = new Date();
      const claimUpdated = await tx.taskClaim.updateMany({
        where: {
          id: claim.id,
          creditedAt: null,
        },
        data: {
          creditedAt: now,
          pendingUntil: now,
        },
      });

      if (claimUpdated.count !== 1) {
        throw new Error("CLAIM_CONFLICT");
      }

      await tx.user.update({
        where: {
          id: claim.userId,
        },
        data: {
          balanceCents: {
            increment: claim.payoutCents,
          },
          lifetimeEarnedCents: {
            increment: claim.payoutCents,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: claim.userId,
          type: "EARN_RELEASE",
          amountCents: claim.payoutCents,
          description: `Admin early release for pending offer from ${claim.offerwallName}: ${claim.offerTitle ?? claim.taskKey}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLAIM_NOT_FOUND") {
      return NextResponse.json({ error: "Offer claim not found." }, { status: 404 });
    }

    if (error instanceof Error && (error.message === "ALREADY_RELEASED" || error.message === "CLAIM_CONFLICT")) {
      return NextResponse.json({ error: "Offer claim is already released." }, { status: 400 });
    }

    return NextResponse.json({ error: "Could not release offer claim." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

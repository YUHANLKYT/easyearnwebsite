import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CustomWithdrawalAction = "approve" | "decline";

function isAction(value: string): value is CustomWithdrawalAction {
  return value === "approve" || value === "decline";
}

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        action?: string;
        redemptionId?: string;
        reason?: string;
        fulfillment?: string;
      }
    | null;

  if (!payload?.action || !payload.redemptionId || !isAction(payload.action)) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const reason = payload.reason?.trim() || "";
  const fulfillment = payload.fulfillment?.trim() || "";

  if (payload.action === "decline" && reason.length < 3) {
    return NextResponse.json({ error: "Please add a decline reason." }, { status: 400 });
  }

  if (payload.action === "approve" && fulfillment.length < 3) {
    return NextResponse.json({ error: "Please add fulfillment details." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const redemption = await tx.redemption.findUnique({
        where: {
          id: payload.redemptionId,
        },
        select: {
          id: true,
          userId: true,
          amountCents: true,
          method: true,
          status: true,
        },
      });

      if (!redemption) {
        throw new Error("NOT_FOUND");
      }

      if (redemption.method !== "CUSTOM_WITHDRAWAL") {
        throw new Error("WRONG_METHOD");
      }

      if (redemption.status !== "PENDING") {
        throw new Error("INVALID_STATUS");
      }

      if (payload.action === "approve") {
        await tx.redemption.update({
          where: {
            id: redemption.id,
          },
          data: {
            status: "SENT",
            processedById: admin.id,
            processedAt: new Date(),
            customFulfillment: fulfillment,
            customDeclineReason: null,
          },
        });

        await tx.user.update({
          where: {
            id: redemption.userId,
          },
          data: {
            totalWithdrawnCents: {
              increment: redemption.amountCents,
            },
            lastWithdrawalAt: new Date(),
          },
        });

        return;
      }

      await tx.redemption.update({
        where: {
          id: redemption.id,
        },
        data: {
          status: "CANCELED",
          processedById: admin.id,
          processedAt: new Date(),
          customDeclineReason: reason,
          customFulfillment: null,
        },
      });

      await tx.user.update({
        where: {
          id: redemption.userId,
        },
        data: {
          balanceCents: {
            increment: redemption.amountCents,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: redemption.userId,
          type: "WITHDRAWAL_REFUND",
          amountCents: redemption.amountCents,
          description: `Custom withdrawal declined and refunded: ${reason}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Custom request not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "WRONG_METHOD") {
      return NextResponse.json({ error: "This request is not a custom withdrawal." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_STATUS") {
      return NextResponse.json({ error: "Only pending custom requests can be updated." }, { status: 400 });
    }

    return NextResponse.json({ error: "Could not process custom withdrawal action." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

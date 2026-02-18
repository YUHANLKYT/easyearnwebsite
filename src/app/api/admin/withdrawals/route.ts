import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { GIFT_CARD_METHODS } from "@/lib/constants";
import { sendWithdrawalProcessedEmail } from "@/lib/email";
import { getReferralBonusCents } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

type WithdrawalAction = "approve" | "cancel" | "send";
const giftCardMethods = new Set(GIFT_CARD_METHODS);

function isWithdrawalAction(value: string): value is WithdrawalAction {
  return value === "approve" || value === "cancel" || value === "send";
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
        code?: string;
        reason?: string;
      }
    | null;

  if (!payload?.action || !payload.redemptionId || !isWithdrawalAction(payload.action)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  let emailSent = false;
  let emailReason: string | undefined;

  try {
    let emailPayload:
      | {
          toEmail: string;
          toName: string;
          amountCents: number;
          method: string;
          code: string | null;
          redemptionId: string;
        }
      | null = null;

    await prisma.$transaction(async (tx) => {
      const redemption = await tx.redemption.findUnique({
        where: {
          id: payload.redemptionId,
        },
        include: {
          user: {
            select: {
              id: true,
              referredById: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!redemption) {
        throw new Error("REDEMPTION_NOT_FOUND");
      }

      if (redemption.method === "CUSTOM_WITHDRAWAL") {
        throw new Error("CUSTOM_WITHDRAWAL_ROUTE");
      }

      if (payload.action === "approve") {
        if (redemption.status !== "PENDING") {
          throw new Error("INVALID_STATUS_TRANSITION");
        }

        await tx.redemption.update({
          where: { id: redemption.id },
          data: {
            status: "APPROVED",
            processedById: admin.id,
            processedAt: new Date(),
          },
        });
        return;
      }

      if (payload.action === "cancel") {
        if (redemption.status !== "PENDING" && redemption.status !== "APPROVED") {
          throw new Error("INVALID_STATUS_TRANSITION");
        }

        const reason = payload.reason?.trim() ?? "";
        if (reason.length < 3) {
          throw new Error("CANCEL_REASON_REQUIRED");
        }
        if (reason.length > 200) {
          throw new Error("CANCEL_REASON_TOO_LONG");
        }

        await tx.redemption.update({
          where: { id: redemption.id },
          data: {
            status: "CANCELED",
            processedById: admin.id,
            processedAt: new Date(),
            customDeclineReason: reason,
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
            description: `Withdrawal canceled and refunded: ${reason}`,
          },
        });
        return;
      }

      if (payload.action === "send") {
        if (redemption.status !== "APPROVED") {
          throw new Error("INVALID_STATUS_TRANSITION");
        }

        const code = payload.code?.trim() || null;
        if (code && code.length > 120) {
          throw new Error("CODE_TOO_LONG");
        }

        if (!code && giftCardMethods.has(redemption.method)) {
          throw new Error("CODE_REQUIRED");
        }

        const now = new Date();
        let referralBonusCents = 0;

        await tx.redemption.update({
          where: { id: redemption.id },
          data: {
            status: "SENT",
            processedById: admin.id,
            processedAt: now,
            note: code,
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
            lastWithdrawalAt: now,
          },
        });

        if (redemption.user.referredById) {
          referralBonusCents = getReferralBonusCents(redemption.amountCents);
          const referrerUpdated = await tx.user.updateMany({
            where: {
              id: redemption.user.referredById,
            },
            data: {
              balanceCents: {
                increment: referralBonusCents,
              },
              lifetimeEarnedCents: {
                increment: referralBonusCents,
              },
            },
          });

          if (referrerUpdated.count > 0) {
            await tx.transaction.create({
              data: {
                userId: redemption.user.referredById,
                type: "REFERRAL_BONUS",
                amountCents: referralBonusCents,
                description: `5% referral bonus from completed withdrawal`,
                sourceUserId: redemption.userId,
              },
            });
          } else {
            referralBonusCents = 0;
          }
        }

        await tx.redemption.update({
          where: {
            id: redemption.id,
          },
          data: {
            referralBonusCents,
            referralBonusPaidAt: referralBonusCents > 0 ? now : null,
          },
        });

        emailPayload = {
          toEmail: redemption.user.email,
          toName: redemption.user.name,
          amountCents: redemption.amountCents,
          method: redemption.method,
          code,
          redemptionId: redemption.id,
        };
      }
    });

    if (emailPayload) {
      const emailResult = await sendWithdrawalProcessedEmail(emailPayload);
      emailSent = emailResult.sent;
      emailReason = emailResult.reason;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "REDEMPTION_NOT_FOUND") {
      return NextResponse.json({ error: "Withdrawal request not found." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "INVALID_STATUS_TRANSITION") {
      return NextResponse.json({ error: "Action is not valid for this withdrawal state." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "CODE_REQUIRED") {
      return NextResponse.json({ error: "Enter CODE before marking this gift card as sent." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "CODE_TOO_LONG") {
      return NextResponse.json({ error: "CODE is too long." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "CANCEL_REASON_REQUIRED") {
      return NextResponse.json({ error: "Enter a cancel reason (minimum 3 characters)." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "CANCEL_REASON_TOO_LONG") {
      return NextResponse.json({ error: "Cancel reason is too long." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "CUSTOM_WITHDRAWAL_ROUTE") {
      return NextResponse.json(
        { error: "Use the custom withdrawal admin action route for this request." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Could not process withdrawal action." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    emailSent,
    emailReason: emailSent ? null : emailReason ?? null,
  });
}

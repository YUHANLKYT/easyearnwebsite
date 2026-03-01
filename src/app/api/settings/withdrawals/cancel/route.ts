import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeInternalRedirect } from "@/lib/validation";

function buildRedirect(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?next=/settings");
  }

  const formData = await request.formData();
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/settings");
  const redemptionId = formData.get("redemptionId")?.toString().trim() ?? "";

  if (!redemptionId) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Invalid withdrawal request.",
      }),
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const redemption = await tx.redemption.findUnique({
        where: {
          id: redemptionId,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          amountCents: true,
        },
      });

      if (!redemption || redemption.userId !== user.id) {
        throw new Error("REDEMPTION_NOT_FOUND");
      }

      if (redemption.status !== "PENDING") {
        throw new Error("INVALID_STATUS");
      }

      const canceled = await tx.redemption.updateMany({
        where: {
          id: redemption.id,
          userId: user.id,
          status: "PENDING",
        },
        data: {
          status: "CANCELED",
          processedAt: new Date(),
          customDeclineReason: "Canceled by user",
        },
      });

      if (canceled.count !== 1) {
        throw new Error("INVALID_STATUS");
      }

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          balanceCents: {
            increment: redemption.amountCents,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "WITHDRAWAL_REFUND",
          amountCents: redemption.amountCents,
          description: "Withdrawal canceled by user and refunded.",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REDEMPTION_NOT_FOUND") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Withdrawal request not found.",
        }),
      );
    }

    if (error instanceof Error && error.message === "INVALID_STATUS") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Only processing withdrawals can be canceled.",
        }),
      );
    }

    redirect(
      buildRedirect(redirectTo, {
        error: "Could not cancel withdrawal. Please try again.",
      }),
    );
  }

  redirect(
    buildRedirect(redirectTo, {
      notice: "Withdrawal canceled and refunded to your wallet.",
    }),
  );
}


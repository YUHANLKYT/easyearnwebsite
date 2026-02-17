import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  PROMO_CODE_MAX_REWARD_CENTS,
  PROMO_CODE_MAX_USES,
  PROMO_CODE_MIN_REWARD_CENTS,
  VIP_UNLOCK_LEVEL,
} from "@/lib/constants";
import { getLevelFromLifetimeEarnings } from "@/lib/gamification";
import { formatUSD, parseDollarInputToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { createPromoCodeSchema, sanitizeInternalRedirect } from "@/lib/validation";

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
    redirect("/signin?next=/referrals");
  }

  const formData = await request.formData();
  const parsed = createPromoCodeSchema.safeParse({
    code: formData.get("code"),
    rewardAmount: formData.get("rewardAmount"),
    maxUses: formData.get("maxUses"),
    minLevel: formData.get("minLevel"),
    audience: formData.get("audience"),
    redirectTo: formData.get("redirectTo"),
  });
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/referrals");

  if (!parsed.success) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Enter a valid code, reward amount, level requirement, and max uses.",
      }),
    );
  }

  const rewardCents = parseDollarInputToCents(parsed.data.rewardAmount);
  if (
    rewardCents === null ||
    rewardCents < PROMO_CODE_MIN_REWARD_CENTS ||
    rewardCents > PROMO_CODE_MAX_REWARD_CENTS
  ) {
    redirect(
      buildRedirect(redirectTo, {
        error: `Reward must be between ${formatUSD(PROMO_CODE_MIN_REWARD_CENTS)} and ${formatUSD(PROMO_CODE_MAX_REWARD_CENTS)}.`,
      }),
    );
  }

  if (parsed.data.maxUses > PROMO_CODE_MAX_USES) {
    redirect(
      buildRedirect(redirectTo, {
        error: `Max uses cannot exceed ${PROMO_CODE_MAX_USES}.`,
      }),
    );
  }

  const level = getLevelFromLifetimeEarnings(user.lifetimeEarnedCents);
  if (level < VIP_UNLOCK_LEVEL) {
    redirect(
      buildRedirect(redirectTo, {
        error: `Promo code creation unlocks at level ${VIP_UNLOCK_LEVEL}.`,
      }),
    );
  }

  const fundingCostCents = rewardCents * parsed.data.maxUses;
  const code = parsed.data.code.trim().toUpperCase();

  try {
    await prisma.$transaction(async (tx) => {
      const latestUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          status: true,
          balanceCents: true,
        },
      });

      if (!latestUser) {
        throw new Error("USER_NOT_FOUND");
      }

      if (latestUser.status !== "ACTIVE") {
        throw new Error("ACCOUNT_RESTRICTED");
      }

      if (latestUser.balanceCents < fundingCostCents) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const existingCode = await tx.promoCode.findUnique({
        where: {
          code,
        },
        select: {
          id: true,
        },
      });

      if (existingCode) {
        throw new Error("CODE_EXISTS");
      }

      await tx.user.update({
        where: {
          id: latestUser.id,
        },
        data: {
          balanceCents: {
            decrement: fundingCostCents,
          },
        },
      });

      await tx.promoCode.create({
        data: {
          code,
          creatorId: latestUser.id,
          rewardCents,
          maxUses: parsed.data.maxUses,
          minLevel: parsed.data.minLevel,
          audience: parsed.data.audience,
          isActive: true,
        },
      });

      await tx.transaction.create({
        data: {
          userId: latestUser.id,
          type: "PROMO_CODE_CREATE",
          amountCents: -fundingCostCents,
          description: `Created promo code ${code} with funding ${formatUSD(fundingCostCents)}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      redirect(
        buildRedirect(redirectTo, {
          error: "User not found.",
        }),
      );
    }

    if (error instanceof Error && error.message === "ACCOUNT_RESTRICTED") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Muted or terminated accounts cannot create promo codes.",
        }),
      );
    }

    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      redirect(
        buildRedirect(redirectTo, {
          error: `Insufficient balance. You need ${formatUSD(fundingCostCents)} to fund this code.`,
        }),
      );
    }

    if (error instanceof Error && error.message === "CODE_EXISTS") {
      redirect(
        buildRedirect(redirectTo, {
          error: "That promo code already exists. Choose another.",
        }),
      );
    }

    redirect(
      buildRedirect(redirectTo, {
        error: "Could not create promo code.",
      }),
    );
  }

  redirect(
    buildRedirect(redirectTo, {
      notice: `Promo code ${code} created.`,
    }),
  );
}

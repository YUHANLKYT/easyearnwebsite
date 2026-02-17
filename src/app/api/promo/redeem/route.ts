import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { PROMO_REDEEM_UNLOCK_LEVEL } from "@/lib/constants";
import { getLevelFromLifetimeEarnings } from "@/lib/gamification";
import { formatUSD } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { redeemPromoCodeSchema, sanitizeInternalRedirect } from "@/lib/validation";

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
  const parsed = redeemPromoCodeSchema.safeParse({
    code: formData.get("code"),
    redirectTo: formData.get("redirectTo"),
  });
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/referrals");

  if (!parsed.success) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Enter a valid promo code.",
      }),
    );
  }

  const code = parsed.data.code.trim().toUpperCase();

  try {
    const reward = await prisma.$transaction(async (tx) => {
      const latestUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          status: true,
          referredById: true,
          lifetimeEarnedCents: true,
        },
      });

      if (!latestUser) {
        throw new Error("USER_NOT_FOUND");
      }

      if (latestUser.status !== "ACTIVE") {
        throw new Error("ACCOUNT_RESTRICTED");
      }

      const userLevel = getLevelFromLifetimeEarnings(latestUser.lifetimeEarnedCents);
      if (userLevel < PROMO_REDEEM_UNLOCK_LEVEL) {
        throw new Error("PROMO_REDEEM_LOCKED");
      }

      const promo = await tx.promoCode.findUnique({
        where: {
          code,
        },
        select: {
          id: true,
          creatorId: true,
          rewardCents: true,
          maxUses: true,
          minLevel: true,
          usesCount: true,
          audience: true,
          isActive: true,
        },
      });

      if (!promo) {
        throw new Error("CODE_NOT_FOUND");
      }

      if (!promo.isActive || promo.usesCount >= promo.maxUses) {
        throw new Error("CODE_INACTIVE");
      }

      if (promo.creatorId === latestUser.id) {
        throw new Error("SELF_REDEEM");
      }

      if (userLevel < promo.minLevel) {
        throw new Error("LEVEL_REQUIRED");
      }

      if (promo.audience === "REFERRAL_ONLY" && latestUser.referredById !== promo.creatorId) {
        throw new Error("REFERRAL_ONLY");
      }

      const existingRedemption = await tx.promoCodeRedemption.findFirst({
        where: {
          promoCodeId: promo.id,
          userId: latestUser.id,
        },
        select: {
          id: true,
        },
      });

      if (existingRedemption) {
        throw new Error("ALREADY_REDEEMED");
      }

      await tx.promoCodeRedemption.create({
        data: {
          promoCodeId: promo.id,
          userId: latestUser.id,
        },
      });

      const nextUses = promo.usesCount + 1;
      await tx.promoCode.update({
        where: {
          id: promo.id,
        },
        data: {
          usesCount: {
            increment: 1,
          },
          isActive: nextUses < promo.maxUses,
        },
      });

      await tx.user.update({
        where: {
          id: latestUser.id,
        },
        data: {
          balanceCents: {
            increment: promo.rewardCents,
          },
          lifetimeEarnedCents: {
            increment: promo.rewardCents,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: latestUser.id,
          type: "PROMO_CODE_REDEEM",
          amountCents: promo.rewardCents,
          description: `Redeemed promo code ${code}`,
        },
      });

      return promo.rewardCents;
    });

    redirect(
      buildRedirect(redirectTo, {
        notice: `Promo code redeemed for ${formatUSD(reward)}.`,
      }),
    );
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
          error: "Muted or terminated accounts cannot redeem promo codes.",
        }),
      );
    }

    if (error instanceof Error && error.message === "CODE_NOT_FOUND") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Promo code not found.",
        }),
      );
    }

    if (error instanceof Error && error.message === "CODE_INACTIVE") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Promo code is inactive or fully used.",
        }),
      );
    }

    if (error instanceof Error && error.message === "SELF_REDEEM") {
      redirect(
        buildRedirect(redirectTo, {
          error: "You cannot redeem your own promo code.",
        }),
      );
    }

    if (error instanceof Error && error.message === "PROMO_REDEEM_LOCKED") {
      redirect(
        buildRedirect(redirectTo, {
          error: `Promo code redemption unlocks at Level ${PROMO_REDEEM_UNLOCK_LEVEL}. Check the Levels tab.`,
        }),
      );
    }

    if (error instanceof Error && error.message === "LEVEL_REQUIRED") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Your level is below this code's minimum requirement.",
        }),
      );
    }

    if (error instanceof Error && error.message === "REFERRAL_ONLY") {
      redirect(
        buildRedirect(redirectTo, {
          error: "This promo code is referral-only.",
        }),
      );
    }

    if (error instanceof Error && error.message === "ALREADY_REDEEMED") {
      redirect(
        buildRedirect(redirectTo, {
          error: "You already redeemed this promo code.",
        }),
      );
    }

    redirect(
      buildRedirect(redirectTo, {
        error: "Could not redeem promo code.",
      }),
    );
  }
}

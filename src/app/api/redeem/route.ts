import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { PAYOUT_REGION_TO_CURRENCY, REDEMPTION_OPTIONS, getAmountChoicesForRegion, type PayoutCurrency } from "@/lib/constants";
import { convertFaceCentsToUsdCents, getUsdFxData } from "@/lib/fx";
import { formatUSD, parseDollarInputToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { redeemSchema, sanitizeInternalRedirect } from "@/lib/validation";

function buildRedirect(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function formatPayoutCurrency(cents: number, currency: PayoutCurrency): string {
  const locale = currency === "AUD" ? "en-AU" : currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidDiscordUsername(value: string): boolean {
  return /^@[A-Za-z0-9._]{2,32}$/.test(value);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?next=/store");
  }

  const formData = await request.formData();
  const parsed = redeemSchema.safeParse({
    method: formData.get("method"),
    region: formData.get("region"),
    amount: formData.get("amount"),
    payoutEmail: formData.get("payoutEmail")?.toString() ?? undefined,
    discordUsername: formData.get("discordUsername")?.toString() ?? undefined,
    redirectTo: formData.get("redirectTo"),
  });
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/store");

  if (user.status !== "ACTIVE") {
    redirect(
      buildRedirect(redirectTo, {
        error: "Muted or terminated accounts cannot request withdrawals.",
      }),
    );
  }

  if (!parsed.success) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Please choose a valid payout method and amount.",
      }),
    );
  }

  const option = REDEMPTION_OPTIONS.find((item) => item.method === parsed.data.method);
  if (!option) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Redemption option is unavailable.",
      }),
    );
  }

  const payoutEmail = parsed.data.payoutEmail?.trim().toLowerCase() ?? "";
  const discordUsername = parsed.data.discordUsername?.trim() ?? "";
  if (option.method === "PAYPAL") {
    if (!payoutEmail || !isValidEmail(payoutEmail)) {
      redirect(
        buildRedirect(redirectTo, {
          error: "Enter a valid PayPal email before redeeming.",
        }),
      );
    }
  }

  if (option.method === "DISCORD_NITRO") {
    if (!discordUsername || !isValidDiscordUsername(discordUsername)) {
      redirect(
        buildRedirect(redirectTo, {
          error: "Enter a valid Discord username in @username format before redeeming.",
        }),
      );
    }
  }

  const faceValueCents = parseDollarInputToCents(parsed.data.amount);
  if (faceValueCents === null) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Enter a valid payout amount.",
      }),
    );
  }

  const payoutRegion = parsed.data.region;
  if (option.supportedRegions && !option.supportedRegions.includes(payoutRegion)) {
    const supported = option.supportedRegions.join(", ");
    redirect(
      buildRedirect(redirectTo, {
        error: `${option.label} is only available for region: ${supported}.`,
      }),
    );
  }
  const payoutCurrency = PAYOUT_REGION_TO_CURRENCY[payoutRegion];
  const allowedFaceValues = getAmountChoicesForRegion(option, payoutRegion);
  const minFaceValueForRegion = allowedFaceValues.length > 0 ? Math.min(...allowedFaceValues) : option.minAmountCents;

  if (faceValueCents < minFaceValueForRegion) {
    redirect(
      buildRedirect(redirectTo, {
        error: `Minimum for ${option.label} is ${formatPayoutCurrency(minFaceValueForRegion, payoutCurrency)} ${payoutCurrency} face value.`,
      }),
    );
  }

  if (!allowedFaceValues.includes(faceValueCents)) {
    const available = allowedFaceValues
      .map((value) => `${formatPayoutCurrency(value, payoutCurrency)} ${payoutCurrency}`)
      .join(", ");
    redirect(
      buildRedirect(redirectTo, {
        error: `Choose one allowed face value for ${option.label}: ${available}.`,
      }),
    );
  }
  const fx = await getUsdFxData();
  const amountCents = convertFaceCentsToUsdCents(faceValueCents, payoutCurrency, fx.rates);
  if (amountCents < 1) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Invalid payout conversion. Please try again.",
      }),
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const latestUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          balanceCents: true,
          status: true,
        },
      });

      if (!latestUser || latestUser.balanceCents < amountCents) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      if (latestUser.status !== "ACTIVE") {
        throw new Error("ACCOUNT_RESTRICTED");
      }

      await tx.user.update({
        where: {
          id: latestUser.id,
        },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      await tx.redemption.create({
        data: {
          userId: latestUser.id,
          method: option.method,
          amountCents,
          payoutRegion,
          payoutCurrency,
          faceValueCents,
          payoutEmail: option.method === "PAYPAL" ? payoutEmail : null,
          discordUsername: option.method === "DISCORD_NITRO" ? discordUsername : null,
          status: "PENDING",
        },
      });

      await tx.transaction.create({
        data: {
          userId: latestUser.id,
          type: "WITHDRAWAL",
          amountCents: -amountCents,
          description: `Withdrawal request via ${option.label} ${formatPayoutCurrency(faceValueCents, payoutCurrency)} ${payoutCurrency} (${formatUSD(amountCents)} charged, pending admin approval)`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Insufficient balance for this withdrawal.",
        }),
      );
    }

    if (error instanceof Error && error.message === "ACCOUNT_RESTRICTED") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Muted or terminated accounts cannot request withdrawals.",
        }),
      );
    }

    redirect(
      buildRedirect(redirectTo, {
        error: "Redemption failed. Please try again.",
      }),
    );
  }

  redirect(
    buildRedirect(redirectTo, {
      notice: `Withdrawal request submitted for ${formatPayoutCurrency(faceValueCents, payoutCurrency)} ${payoutCurrency} (charged ${formatUSD(amountCents)}).`,
    }),
  );
}

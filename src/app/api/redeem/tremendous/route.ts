import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { formatUSD, parseDollarInputToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getTremendousCatalogEntryById } from "@/lib/tremendous";
import { sanitizeInternalRedirect } from "@/lib/validation";

type FxResponse = {
  rates?: Record<string, number>;
};

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

function mapCurrencyToPayoutMeta(currency: string): { payoutCurrency: "USD" | "AUD" | "GBP"; payoutRegion: "US" | "AUS" | "UK" } {
  if (currency === "AUD") {
    return { payoutCurrency: "AUD", payoutRegion: "AUS" };
  }
  if (currency === "GBP") {
    return { payoutCurrency: "GBP", payoutRegion: "UK" };
  }
  return { payoutCurrency: "USD", payoutRegion: "US" };
}

async function getUsdRateForCurrency(currency: string): Promise<number | null> {
  if (currency === "USD") {
    return 1;
  }

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as FxResponse;
    const rate = payload.rates?.[currency];
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      return null;
    }
    return rate;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?next=/store");
  }

  const formData = await request.formData();
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/store");

  const catalogId = formData.get("catalogId")?.toString().trim() ?? "";
  const amountInput = formData.get("amount")?.toString() ?? "";
  const countryInput = formData.get("country")?.toString().trim() ?? "";

  if (user.status !== "ACTIVE") {
    redirect(buildRedirect(redirectTo, { error: "Muted or terminated accounts cannot request withdrawals." }));
  }

  if (!user.emailVerifiedAt) {
    redirect(buildRedirect(redirectTo, { error: "Verify your email before requesting withdrawals." }));
  }

  const entry = getTremendousCatalogEntryById(catalogId);
  if (!entry) {
    redirect(buildRedirect(redirectTo, { error: "Selected Tremendous gift card is unavailable." }));
  }

  const faceValueCents = parseDollarInputToCents(amountInput);
  if (faceValueCents === null) {
    redirect(buildRedirect(redirectTo, { error: "Enter a valid amount for the selected gift card." }));
  }

  const minFaceCents = Math.max(500, Math.round((entry.minAmount ?? 5) * 100));
  const maxFaceCents = Math.max(minFaceCents, Math.round((entry.maxAmount ?? 1000) * 100));

  if (faceValueCents < minFaceCents || faceValueCents > maxFaceCents) {
    redirect(
      buildRedirect(redirectTo, {
        error: `Amount must be between ${(minFaceCents / 100).toFixed(2)} and ${(maxFaceCents / 100).toFixed(2)} ${entry.currency}.`,
      }),
    );
  }

  const rate = await getUsdRateForCurrency(entry.currency);
  if (!rate) {
    redirect(
      buildRedirect(redirectTo, {
        error: `Unsupported currency conversion for ${entry.currency} right now. Please try again later.`,
      }),
    );
  }

  const amountCents = Math.max(1, Math.round(faceValueCents / rate));
  const requestedLocalAmount = `${(faceValueCents / 100).toFixed(2)} ${entry.currency}`;
  const payoutMeta = mapCurrencyToPayoutMeta(entry.currency);
  const customName = `Tremendous: ${entry.product}`;
  const customDestination = [
    `Currency=${entry.currency}`,
    `LocalAmount=${requestedLocalAmount}`,
    `CatalogID=${entry.id}`,
    `Country=${countryInput || "Not specified"}`,
  ].join(" | ");

  try {
    await prisma.$transaction(async (tx) => {
      const latestUser = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          balanceCents: true,
          status: true,
          emailVerifiedAt: true,
        },
      });

      if (!latestUser || latestUser.balanceCents < amountCents) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      if (latestUser.status !== "ACTIVE") {
        throw new Error("ACCOUNT_RESTRICTED");
      }
      if (!latestUser.emailVerifiedAt) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      await tx.user.update({
        where: { id: latestUser.id },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      await tx.redemption.create({
        data: {
          userId: latestUser.id,
          method: "CUSTOM_WITHDRAWAL",
          amountCents,
          payoutRegion: payoutMeta.payoutRegion,
          payoutCurrency: payoutMeta.payoutCurrency,
          faceValueCents: payoutMeta.payoutCurrency === "USD" ? amountCents : faceValueCents,
          customName,
          customDestination,
          status: "PENDING",
        },
      });

      await tx.transaction.create({
        data: {
          userId: latestUser.id,
          type: "WITHDRAWAL",
          amountCents: -amountCents,
          description: `Tremendous request: ${entry.product} (${requestedLocalAmount}, charged ${formatUSD(amountCents)} pending admin review)`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      redirect(buildRedirect(redirectTo, { error: "Insufficient balance for this Tremendous request." }));
    }

    if (error instanceof Error && error.message === "ACCOUNT_RESTRICTED") {
      redirect(buildRedirect(redirectTo, { error: "Muted or terminated accounts cannot request withdrawals." }));
    }

    if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
      redirect(buildRedirect(redirectTo, { error: "Verify your email before requesting withdrawals." }));
    }

    redirect(buildRedirect(redirectTo, { error: "Tremendous request failed. Please try again." }));
  }

  redirect(
    buildRedirect(redirectTo, {
      notice: `Tremendous request submitted for ${entry.product} (${requestedLocalAmount}, charged ${formatUSD(amountCents)}).`,
    }),
  );
}


import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { customRedeemSchema, sanitizeInternalRedirect } from "@/lib/validation";
import { formatUSD, parseDollarInputToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?next=/store");
  }

  const formData = await request.formData();
  const parsed = customRedeemSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    destination: formData.get("destination")?.toString() ?? undefined,
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
        error: "Enter a valid custom name and USD amount.",
      }),
    );
  }

  const amountCents = parseDollarInputToCents(parsed.data.amount);
  if (amountCents === null || amountCents < 100 || amountCents > 100000) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Custom request price must be between $1.00 and $1000.00.",
      }),
    );
  }

  const customName = parsed.data.name.trim();
  const customDestination = parsed.data.destination?.trim() || null;

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
          method: "CUSTOM_WITHDRAWAL",
          amountCents,
          payoutRegion: "US",
          payoutCurrency: "USD",
          faceValueCents: amountCents,
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
          description: `Custom withdrawal request: ${customName} (${formatUSD(amountCents)} pending admin review)`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      redirect(
        buildRedirect(redirectTo, {
          error: "Insufficient balance for this custom withdrawal request.",
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
        error: "Custom withdrawal request failed. Please try again.",
      }),
    );
  }

  redirect(
    buildRedirect(redirectTo, {
      notice: `Custom withdrawal submitted for ${customName} (${formatUSD(amountCents)}).`,
    }),
  );
}

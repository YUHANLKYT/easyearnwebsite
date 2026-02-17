import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { EARN_TASKS } from "@/lib/constants";
import { formatUSD } from "@/lib/money";
import { buildPendingEarnNotice, getOfferPendingDays, getPendingUntil } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";
import { earnClaimSchema, sanitizeInternalRedirect } from "@/lib/validation";

function buildEarnRedirect(path: string, params: Record<string, string | undefined>) {
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
    redirect("/signin?next=/earn");
  }

  if (user.status !== "ACTIVE") {
    redirect("/earn?error=Your account is currently muted or terminated.");
  }

  const formData = await request.formData();
  const parsed = earnClaimSchema.safeParse({
    taskKey: formData.get("taskKey"),
    redirectTo: formData.get("redirectTo"),
  });

  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/earn");

  if (!parsed.success) {
    redirect(
      buildEarnRedirect(redirectTo, {
        error: "Invalid earn action.",
      }),
    );
  }

  const task = EARN_TASKS.find((item) => item.key === parsed.data.taskKey);
  if (!task) {
    redirect(
      buildEarnRedirect(redirectTo, {
        error: "Task not found.",
      }),
    );
  }

  const latestClaim = await prisma.taskClaim.findFirst({
    where: {
      userId: user.id,
      taskKey: task.key,
    },
    orderBy: {
      claimedAt: "desc",
    },
  });

  if (latestClaim) {
    const cooldownEndsAt = new Date(latestClaim.claimedAt.getTime() + task.cooldownMinutes * 60 * 1000);
    const now = new Date();
    if (cooldownEndsAt > now) {
      const remainingMinutes = Math.ceil((cooldownEndsAt.getTime() - now.getTime()) / (60 * 1000));
      redirect(
        buildEarnRedirect(redirectTo, {
          error: `${task.title} resets in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
        }),
      );
    }
  }

  const pendingDays = getOfferPendingDays(task.payoutCents);
  const pendingUntil = getPendingUntil(task.payoutCents);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.taskClaim.create({
      data: {
        userId: user.id,
        taskKey: task.key,
        offerwallName: "Easy Earn Internal",
        offerId: task.key,
        offerTitle: task.title,
        payoutCents: task.payoutCents,
        pendingUntil,
        creditedAt: pendingDays > 0 ? null : now,
      },
    });

    if (pendingDays > 0) {
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "EARN_PENDING",
          amountCents: task.payoutCents,
          description: buildPendingEarnNotice(task.payoutCents, pendingDays),
        },
      });
      return;
    }

    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        balanceCents: {
          increment: task.payoutCents,
        },
        lifetimeEarnedCents: {
          increment: task.payoutCents,
        },
      },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "EARN",
        amountCents: task.payoutCents,
        description: `Earned from ${task.title}`,
      },
    });
  });

  redirect(
    buildEarnRedirect(redirectTo, {
      notice:
        pendingDays > 0
          ? `${formatUSD(task.payoutCents)} is pending for ${pendingDays} days. It will not count toward level until released.`
          : `You earned ${formatUSD(task.payoutCents)}.`,
    }),
  );
}

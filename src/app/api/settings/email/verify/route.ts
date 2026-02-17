import { createHash } from "node:crypto";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    redirect(buildRedirect("/signin", { error: "Verification link is invalid." }));
  }

  const tokenHash = hashToken(token);
  const verification = await prisma.emailVerificationToken.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
    },
  });

  if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
    redirect(buildRedirect("/signin", { error: "Verification link is invalid or expired." }));
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: {
        id: verification.id,
      },
      data: {
        usedAt: now,
      },
    }),
    prisma.user.update({
      where: {
        id: verification.userId,
      },
      data: {
        emailVerifiedAt: now,
      },
    }),
  ]);

  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(buildRedirect("/settings", { notice: "Email verified successfully." }));
  }

  redirect(
    buildRedirect("/signin", {
      next: "/settings",
      notice: "Email verified. Sign in to continue.",
    }),
  );
}

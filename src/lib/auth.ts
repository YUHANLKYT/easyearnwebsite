import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/constants";
import { releaseMaturedPendingOfferCredits } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  return expiresAt;
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createUserSession(userId: string): Promise<void> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiryDate();

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    await prisma.session
      .delete({
        where: {
          tokenHash,
        },
      })
      .catch(() => undefined);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  if (session.user.status === "TERMINATED") {
    return null;
  }

  const releaseResult = await releaseMaturedPendingOfferCredits(session.user.id);
  if (releaseResult.releasedCount < 1) {
    return session.user;
  }

  const refreshedUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!refreshedUser || refreshedUser.status === "TERMINATED") {
    return null;
  }

  return refreshedUser;
}

export async function requireUser(nextPath = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function requireAdmin(nextPath = "/admin") {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect(`/admin/signin?next=${encodeURIComponent(nextPath)}`);
  }

  if (user.status !== "ACTIVE") {
    redirect("/admin/signin?error=Admin account is not active.");
  }

  return user;
}

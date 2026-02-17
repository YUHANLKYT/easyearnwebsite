import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { sendEmailVerificationLink } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sanitizeInternalRedirect, sendVerificationEmailSchema } from "@/lib/validation";

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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?next=/settings");
  }

  const formData = await request.formData();
  const parsed = sendVerificationEmailSchema.safeParse({
    redirectTo: formData.get("redirectTo"),
  });
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/settings");

  if (!parsed.success) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Invalid request.",
      }),
    );
  }

  const latestUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!latestUser) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Account not found.",
      }),
    );
  }

  if (latestUser.emailVerifiedAt) {
    redirect(
      buildRedirect(redirectTo, {
        notice: "Your email is already verified.",
      }),
    );
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: {
        userId: latestUser.id,
      },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: latestUser.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  const sent = await sendEmailVerificationLink({
    toEmail: latestUser.email,
    toName: latestUser.name,
    token: rawToken,
  });

  if (!sent.sent) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Verification email could not be sent. Configure SMTP in .env and try again.",
      }),
    );
  }

  redirect(
    buildRedirect(redirectTo, {
      notice: "Verification email sent. Check your inbox.",
    }),
  );
}

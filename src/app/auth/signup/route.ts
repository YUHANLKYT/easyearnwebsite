import { hash } from "bcryptjs";
import { redirect } from "next/navigation";

import { createUserSession } from "@/lib/auth";
import { SIGNUP_BONUS_CENTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createUniqueReferralCode } from "@/lib/users";
import { sanitizeInternalRedirect, signUpSchema } from "@/lib/validation";

function buildSignupRedirect(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `/signup?${query}` : "/signup";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    referralCode: formData.get("referralCode"),
    acceptLegal: formData.get("acceptLegal"),
    next: formData.get("next"),
  });

  const fallbackNext = sanitizeInternalRedirect(formData.get("next")?.toString(), "/dashboard");

  if (!parsed.success) {
    redirect(
      buildSignupRedirect({
        error: "Please fill every field correctly and accept the Privacy Policy and Terms.",
        next: fallbackNext,
      }),
    );
  }

  const nextPath = sanitizeInternalRedirect(parsed.data.next, "/dashboard");
  const normalizedReferralCode = parsed.data.referralCode?.trim().toUpperCase() || "";
  const normalizedName = parsed.data.name.trim();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    redirect(
      buildSignupRedirect({
        error: "That email is already registered.",
        referral: normalizedReferralCode || undefined,
        next: nextPath,
      }),
    );
  }

  const existingUsername = await prisma.user.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUsername) {
    redirect(
      buildSignupRedirect({
        error: "That username already exists. Please choose a different one.",
        referral: normalizedReferralCode || undefined,
        next: nextPath,
      }),
    );
  }

  let referrerId: string | undefined;
  if (normalizedReferralCode) {
    const referrer = await prisma.user.findUnique({
      where: {
        referralCode: normalizedReferralCode,
      },
      select: {
        id: true,
      },
    });

    if (!referrer) {
      redirect(
        buildSignupRedirect({
          error: "Referral code is invalid.",
          referral: normalizedReferralCode,
          next: nextPath,
        }),
      );
    }
    referrerId = referrer.id;
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const generatedReferralCode = await createUniqueReferralCode();
  const signupBonusCents = referrerId ? SIGNUP_BONUS_CENTS : 0;

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: normalizedName,
        email: parsed.data.email,
        passwordHash,
        referralCode: generatedReferralCode,
        referredById: referrerId,
        balanceCents: signupBonusCents,
        lifetimeEarnedCents: signupBonusCents,
      },
      select: {
        id: true,
      },
    });

    if (signupBonusCents > 0) {
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "EARN",
          amountCents: signupBonusCents,
          description: "Referral sign-up bonus",
        },
      });
    }

    return user;
  });

  await createUserSession(createdUser.id);
  if (signupBonusCents > 0) {
    redirect("/dashboard?signupBonus=1");
  }

  redirect(nextPath);
}

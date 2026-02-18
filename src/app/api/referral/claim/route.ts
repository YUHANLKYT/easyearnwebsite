import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { SIGNUP_BONUS_CENTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

function normalizeReferralCode(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toUpperCase();
}

function isValidReferralCode(value: string) {
  return /^[A-Z0-9_-]{2,32}$/.test(value);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const referralCode = normalizeReferralCode((payload as { referralCode?: string } | null)?.referralCode);
  if (!isValidReferralCode(referralCode)) {
    return NextResponse.json({ ok: false, error: "Enter a valid referral code." }, { status: 400 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "Muted or terminated accounts cannot claim referral bonus." }, { status: 403 });
  }

  if (user.referredById) {
    return NextResponse.json({ ok: false, error: "Referral is already set for this account." }, { status: 409 });
  }

  if (user.referralCode.toUpperCase() === referralCode) {
    return NextResponse.json({ ok: false, error: "You cannot use your own referral code." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const latestUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          status: true,
          referredById: true,
          referralCode: true,
        },
      });

      if (!latestUser) {
        throw new Error("USER_NOT_FOUND");
      }

      if (latestUser.status !== "ACTIVE") {
        throw new Error("ACCOUNT_RESTRICTED");
      }

      if (latestUser.referredById) {
        throw new Error("ALREADY_LINKED");
      }

      if (latestUser.referralCode.toUpperCase() === referralCode) {
        throw new Error("SELF_REFERRAL");
      }

      const referrer = await tx.user.findUnique({
        where: {
          referralCode,
        },
        select: {
          id: true,
        },
      });

      if (!referrer) {
        throw new Error("INVALID_CODE");
      }

      const updated = await tx.user.updateMany({
        where: {
          id: latestUser.id,
          referredById: null,
        },
        data: {
          referredById: referrer.id,
          balanceCents: {
            increment: SIGNUP_BONUS_CENTS,
          },
          lifetimeEarnedCents: {
            increment: SIGNUP_BONUS_CENTS,
          },
        },
      });

      if (updated.count !== 1) {
        throw new Error("ALREADY_LINKED");
      }

      await tx.transaction.create({
        data: {
          userId: latestUser.id,
          type: "EARN",
          amountCents: SIGNUP_BONUS_CENTS,
          description: "Referral sign-up bonus",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CODE") {
      return NextResponse.json({ ok: false, error: "Referral code is invalid." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "SELF_REFERRAL") {
      return NextResponse.json({ ok: false, error: "You cannot use your own referral code." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "ALREADY_LINKED") {
      return NextResponse.json({ ok: false, error: "Referral is already set for this account." }, { status: 409 });
    }

    if (error instanceof Error && error.message === "ACCOUNT_RESTRICTED") {
      return NextResponse.json({ ok: false, error: "Muted or terminated accounts cannot claim referral bonus." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: false, error: "Could not claim referral bonus." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    referralCode,
    amountCents: SIGNUP_BONUS_CENTS,
  });
}

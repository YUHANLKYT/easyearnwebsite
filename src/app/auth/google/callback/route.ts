import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createUserSession } from "@/lib/auth";
import { SIGNUP_BONUS_CENTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createUniqueReferralCode } from "@/lib/users";
import { sanitizeInternalRedirect } from "@/lib/validation";

const GOOGLE_OAUTH_STATE_COOKIE = "easyearn_google_oauth_state";

type Source = "signin" | "signup";

type OAuthStatePayload = {
  state: string;
  source: Source;
  next: string;
  referralCode: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function normalizeSource(value: string | undefined): Source {
  return value === "signup" ? "signup" : "signin";
}

function clearGoogleStateCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function buildAuthRedirect(
  source: Source,
  params: {
    error?: string;
    next?: string;
    ref?: string;
  },
) {
  const pathname = source === "signup" ? "/signup" : "/signin";
  const search = new URLSearchParams();
  if (params.error) {
    search.set("error", params.error);
  }
  if (params.next) {
    search.set("next", params.next);
  }
  if (source === "signup" && params.ref) {
    search.set("ref", params.ref);
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function getGoogleConfig(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || new URL("/auth/google/callback", request.url).toString();
  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

function normalizeName(rawName: string | undefined, email: string): string {
  const fallback = email.split("@")[0] || "EasyEarn User";
  const source = (rawName ?? "").trim() || fallback;
  const compact = source.replace(/\s+/g, " ").slice(0, 40).trim();
  if (compact.length >= 2) {
    return compact;
  }
  if (fallback.length >= 2) {
    return fallback.slice(0, 40);
  }
  return "EasyEarn User";
}

async function exchangeCodeForAccessToken(request: Request, code: string): Promise<string | null> {
  const config = getGoogleConfig(request);
  if (!config.clientId || !config.clientSecret) {
    return null;
  }

  const body = new URLSearchParams();
  body.set("code", code);
  body.set("client_id", config.clientId);
  body.set("client_secret", config.clientSecret);
  body.set("redirect_uri", config.redirectUri);
  body.set("grant_type", "authorization_code");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = (await response.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!response.ok || !payload?.access_token) {
    return null;
  }

  return payload.access_token;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as GoogleUserInfo | null;
  return payload;
}

function redirectWithError(
  request: Request,
  source: Source,
  nextPath: string,
  referralCode: string | undefined,
  message: string,
) {
  const response = NextResponse.redirect(
    new URL(
      buildAuthRedirect(source, {
        error: message,
        next: nextPath,
        ref: referralCode,
      }),
      request.url,
    ),
  );
  clearGoogleStateCookie(response);
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const rawStateCookie = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  let oauthState: OAuthStatePayload | null = null;

  if (rawStateCookie) {
    try {
      oauthState = JSON.parse(rawStateCookie) as OAuthStatePayload;
    } catch {
      oauthState = null;
    }
  }

  const source = normalizeSource(oauthState?.source);
  const nextPath = sanitizeInternalRedirect(oauthState?.next, "/dashboard");
  const referralCode = oauthState?.referralCode?.trim().toUpperCase() || undefined;

  if (!code || !state || !oauthState || oauthState.state !== state) {
    return redirectWithError(request, source, nextPath, referralCode, "Google sign-in session expired. Try again.");
  }

  const googleConfig = getGoogleConfig(request);
  if (!googleConfig.clientId || !googleConfig.clientSecret) {
    return redirectWithError(request, source, nextPath, referralCode, "Google sign-in is not configured yet.");
  }

  const accessToken = await exchangeCodeForAccessToken(request, code);
  if (!accessToken) {
    return redirectWithError(request, source, nextPath, referralCode, "Could not complete Google sign-in.");
  }

  const googleUser = await fetchGoogleUserInfo(accessToken);
  const email = googleUser?.email?.trim().toLowerCase();
  const emailVerified = Boolean(googleUser?.email_verified);

  if (!email) {
    return redirectWithError(request, source, nextPath, referralCode, "Google account did not provide an email.");
  }

  if (!emailVerified) {
    return redirectWithError(
      request,
      source,
      nextPath,
      referralCode,
      "Google email must be verified before signing in.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
    },
  });

  if (existingUser) {
    if (existingUser.status === "TERMINATED") {
      return redirectWithError(request, source, nextPath, referralCode, "This account has been terminated.");
    }

    if (!existingUser.emailVerifiedAt) {
      await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          emailVerifiedAt: new Date(),
        },
      });
    }

    await createUserSession(existingUser.id);
    const response = NextResponse.redirect(new URL(existingUser.role === "ADMIN" ? "/admin" : nextPath, request.url));
    clearGoogleStateCookie(response);
    return response;
  }

  let referrerId: string | undefined;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({
      where: {
        referralCode,
      },
      select: {
        id: true,
      },
    });

    if (!referrer) {
      return redirectWithError(request, source, nextPath, referralCode, "Referral code is invalid.");
    }

    referrerId = referrer.id;
  }

  const passwordHash = await hash(randomBytes(32).toString("hex"), 12);
  const generatedReferralCode = await createUniqueReferralCode();
  const signupBonusCents = referrerId ? SIGNUP_BONUS_CENTS : 0;
  const name = normalizeName(googleUser?.name, email);

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        referralCode: generatedReferralCode,
        referredById: referrerId,
        balanceCents: signupBonusCents,
        lifetimeEarnedCents: signupBonusCents,
        emailVerifiedAt: new Date(),
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

  const response = NextResponse.redirect(new URL(signupBonusCents > 0 ? "/dashboard?signupBonus=1" : nextPath, request.url));
  clearGoogleStateCookie(response);
  return response;
}

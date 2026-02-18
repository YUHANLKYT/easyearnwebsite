import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { sanitizeInternalRedirect } from "@/lib/validation";

const GOOGLE_OAUTH_STATE_COOKIE = "easyearn_google_oauth_state";

type Source = "signin" | "signup";

function normalizeSource(value: string | null): Source {
  return value === "signup" ? "signup" : "signin";
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

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
}

function getGoogleRedirectUri(request: Request) {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return new URL("/auth/google/callback", request.url).toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = normalizeSource(searchParams.get("source"));
  const nextPath = sanitizeInternalRedirect(searchParams.get("next"), "/dashboard");
  const referralCode = (searchParams.get("ref") ?? searchParams.get("referral") ?? "").trim().toUpperCase();
  const googleClientId = getGoogleClientId();

  if (!googleClientId) {
    return NextResponse.redirect(
      new URL(
        buildAuthRedirect(source, {
          error: "Google sign-in is not configured yet.",
          next: nextPath,
          ref: referralCode || undefined,
        }),
        request.url,
      ),
    );
  }

  const redirectUri = getGoogleRedirectUri(request);
  const state = randomBytes(24).toString("hex");
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", googleClientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(googleAuthUrl);
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    JSON.stringify({
      state,
      source,
      next: nextPath,
      referralCode: referralCode || null,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    },
  );

  return response;
}

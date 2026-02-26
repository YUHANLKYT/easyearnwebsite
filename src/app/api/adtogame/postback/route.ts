import { NextResponse } from "next/server";

import { buildPendingEarnNotice, getOfferPendingDays, getPendingUntil } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

const OFFERWALL_NAME = "AdtoGame";
const PROVIDER_RESPONSE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "text/plain; charset=utf-8",
};

type ParsedPostback = {
  tx: string | null;
  userId: string | null;
  amountUsdCents: number | null;
  pointsRaw: string | null;
  offerId: string | null;
  offerTitle: string | null;
  conversionId: string | null;
  geo: string | null;
  timestamp: string | null;
  status: string | null;
  token: string | null;
};

function providerOk() {
  return new NextResponse("ok", {
    status: 200,
    headers: PROVIDER_RESPONSE_HEADERS,
  });
}

function providerError(message: string, status = 400) {
  return new NextResponse(`ERROR: ${message}`, {
    status,
    headers: PROVIDER_RESPONSE_HEADERS,
  });
}

function getParam(searchParams: URLSearchParams, keys: string[]): string | null {
  const entries = Array.from(searchParams.entries());

  for (const key of keys) {
    const value = searchParams.get(key);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    const normalizedKey = key.trim().toLowerCase();
    const matched = entries.find(([entryKey]) => entryKey.trim().toLowerCase() === normalizedKey)?.[1];
    if (typeof matched === "string" && matched.trim().length > 0) {
      return matched.trim();
    }
  }

  return null;
}

function parseCents(value: string | null, allowNegative = false): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const cents = Math.round(amount * 100);
  if (!allowNegative && cents < 0) {
    return null;
  }

  return cents;
}

function parsePostback(searchParams: URLSearchParams): ParsedPostback {
  const tx = getParam(searchParams, ["transaction_id", "trans_id", "tx", "conversion_id"]);

  return {
    tx,
    userId: getParam(searchParams, ["user_id", "uid", "ext_user_id", "userid"]),
    amountUsdCents: parseCents(getParam(searchParams, ["payout_usd", "amount_usd", "usd", "payout"]), true),
    pointsRaw: getParam(searchParams, ["points"]),
    offerId: getParam(searchParams, ["offer_id"]),
    offerTitle: getParam(searchParams, ["offer_name"]),
    conversionId: getParam(searchParams, ["conversion_id"]),
    geo: getParam(searchParams, ["geo", "country"]),
    timestamp: getParam(searchParams, ["timestamp"]),
    status: getParam(searchParams, ["status", "event", "type"]),
    token: getParam(searchParams, ["token", "auth", "secret", "api_key"]),
  };
}

function shouldTreatAsReversal(payload: ParsedPostback, payoutCents: number | null): boolean {
  const status = payload.status?.trim().toLowerCase() ?? "";

  if (payoutCents !== null && payoutCents < 0) {
    return true;
  }

  if (
    status === "reversal" ||
    status === "chargeback" ||
    status === "cancel" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "rejected" ||
    status === "declined" ||
    status === "failed" ||
    status === "fraud" ||
    status === "revoked"
  ) {
    return true;
  }

  return status === "-1" || status === "2" || status === "3" || status === "4" || status === "5";
}

function verifyToken(payload: ParsedPostback, headerApiKey?: string | null): boolean {
  const configuredTokens = [
    process.env.ADTOGAME_POSTBACK_TOKEN?.trim(),
    process.env.ADTOGAME_POSTBACK_SECRET?.trim(),
    process.env.ADTOGAME_API_KEY?.trim(),
    process.env.ADTOGAME_APP_TOKEN?.trim(),
    process.env.ADTOGAME_APP_SECRET?.trim(),
    process.env.ADTOGAME_SECRET_KEY?.trim(),
    process.env.ADTOGAME_SERVER_TO_SERVER_KEY?.trim(),
  ].filter((value): value is string => Boolean(value));

  if (configuredTokens.length === 0) {
    // Allow integration during setup if token is not configured.
    return true;
  }

  const providedValues = [payload.token?.trim(), headerApiKey?.trim()].filter((value): value is string => Boolean(value));
  if (providedValues.length === 0) {
    return false;
  }

  return providedValues.some((provided) => configuredTokens.includes(provided));
}

async function handleCredit(payload: ParsedPostback, payoutCents: number) {
  if (!payload.tx || !payload.userId) {
    return providerError("Missing required parameters: transaction_id and user_id.");
  }

  if (payoutCents < 1) {
    return providerOk();
  }

  const now = new Date();
  const taskKey = `adtogame:${payload.tx}`;
  const pendingDays = getOfferPendingDays(payoutCents);
  const pendingUntil = getPendingUntil(payoutCents, now);
  const normalizedOfferId = payload.offerId ?? payload.conversionId ?? payload.tx;
  const offerTitle = payload.offerTitle ?? "AdtoGame Offer";

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: payload.userId as string,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (user.status !== "ACTIVE") {
        throw new Error("USER_NOT_ACTIVE");
      }

      const existingClaim = await tx.taskClaim.findFirst({
        where: {
          taskKey,
        },
        select: {
          id: true,
        },
      });

      if (existingClaim) {
        throw new Error("DUPLICATE");
      }

      await tx.taskClaim.create({
        data: {
          userId: user.id,
          taskKey,
          offerwallName: OFFERWALL_NAME,
          offerId: normalizedOfferId,
          offerTitle,
          payoutCents,
          pendingUntil,
          claimedAt: now,
          creditedAt: pendingDays > 0 ? null : now,
        },
      });

      if (pendingDays > 0) {
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "EARN_PENDING",
            amountCents: payoutCents,
            description: `${buildPendingEarnNotice(payoutCents, pendingDays)} (AdtoGame tx: ${payload.tx})`,
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
            increment: payoutCents,
          },
          lifetimeEarnedCents: {
            increment: payoutCents,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "EARN",
          amountCents: payoutCents,
          description: `AdtoGame reward credited (tx: ${payload.tx})`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DUPLICATE") {
        return providerOk();
      }
      if (error.message === "USER_NOT_FOUND") {
        return providerOk();
      }
      if (error.message === "USER_NOT_ACTIVE") {
        return providerOk();
      }
    }

    return providerError("Could not process AdtoGame reward.", 500);
  }

  return providerOk();
}

async function handleReversal(payload: ParsedPostback) {
  if (!payload.tx) {
    return providerError("Missing transaction_id.");
  }

  const taskKey = `adtogame:${payload.tx}`;
  const reversalDescription = `AdtoGame reward reversed (tx: ${payload.tx})`;
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.taskClaim.findFirst({
        where: {
          taskKey,
        },
        select: {
          id: true,
          userId: true,
          payoutCents: true,
          creditedAt: true,
        },
      });

      if (!claim) {
        throw new Error("CLAIM_NOT_FOUND");
      }

      const existingReversal = await tx.transaction.findFirst({
        where: {
          userId: claim.userId,
          type: "EARN",
          description: reversalDescription,
        },
        select: {
          id: true,
        },
      });

      if (existingReversal) {
        throw new Error("ALREADY_REVERSED");
      }

      if (!claim.creditedAt) {
        await tx.taskClaim.update({
          where: {
            id: claim.id,
          },
          data: {
            creditedAt: now,
            pendingUntil: now,
          },
        });

        await tx.transaction.create({
          data: {
            userId: claim.userId,
            type: "EARN_PENDING",
            amountCents: 0,
            description: `AdtoGame pending reward canceled (tx: ${payload.tx})`,
          },
        });
        return;
      }

      const user = await tx.user.findUnique({
        where: {
          id: claim.userId,
        },
        select: {
          id: true,
          balanceCents: true,
          lifetimeEarnedCents: true,
        },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const balanceDecrement = Math.min(user.balanceCents, claim.payoutCents);
      const lifetimeDecrement = Math.min(user.lifetimeEarnedCents, claim.payoutCents);

      if (balanceDecrement > 0 || lifetimeDecrement > 0) {
        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            balanceCents: {
              decrement: balanceDecrement,
            },
            lifetimeEarnedCents: {
              decrement: lifetimeDecrement,
            },
          },
        });
      }

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "EARN",
          amountCents: -claim.payoutCents,
          description: reversalDescription,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CLAIM_NOT_FOUND") {
        return providerOk();
      }
      if (error.message === "ALREADY_REVERSED") {
        return providerOk();
      }
      if (error.message === "USER_NOT_FOUND") {
        return providerOk();
      }
    }

    return providerError("Could not process AdtoGame reversal.", 500);
  }

  return providerOk();
}

async function handleRequest(params: URLSearchParams, headerApiKey?: string | null) {
  const payload = parsePostback(params);
  const isDebugCallback = params.get("debug")?.trim().toLowerCase() === "true";

  if (isDebugCallback) {
    return NextResponse.json({
      ok: true,
      debug: true,
      parsed: {
        tx: payload.tx,
        userId: payload.userId,
        payoutUsd: payload.amountUsdCents !== null ? payload.amountUsdCents / 100 : null,
        points: payload.pointsRaw,
        offerId: payload.offerId,
        conversionId: payload.conversionId,
      },
      tokenValid: verifyToken(payload, headerApiKey),
      ignored: "Debug callback accepted without wallet credit.",
    });
  }

  if (!payload.tx || !payload.userId) {
    return providerError("Missing required parameters: transaction_id and user_id.");
  }

  if (!verifyToken(payload, headerApiKey)) {
    return providerError("Invalid token.", 401);
  }

  const payoutCents = payload.amountUsdCents;
  if (shouldTreatAsReversal(payload, payoutCents)) {
    return handleReversal(payload);
  }

  if (payoutCents === null) {
    return providerError("Missing payout_usd.");
  }

  return handleCredit(payload, payoutCents);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleRequest(url.searchParams, request.headers.get("x-api-key"));
}

export async function POST(request: Request) {
  const rawBody = await request.clone().text().catch(() => "");
  const url = new URL(request.url);
  const params = new URLSearchParams(url.searchParams);

  const formData = await request.formData().catch(() => null);
  if (formData) {
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }
  }

  if (!formData && rawBody.trim().length > 0) {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    const bodyText = rawBody.trim();

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      (bodyText.includes("=") && bodyText.includes("&"))
    ) {
      const bodyParams = new URLSearchParams(bodyText);
      for (const [key, value] of bodyParams.entries()) {
        if (value.trim().length > 0) {
          params.set(key, value.trim());
        }
      }
    } else if (contentType.includes("application/json") || bodyText.startsWith("{")) {
      try {
        const parsed = JSON.parse(bodyText) as Record<string, unknown>;
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string" && value.trim().length > 0) {
            params.set(key, value.trim());
          } else if (typeof value === "number" && Number.isFinite(value)) {
            params.set(key, String(value));
          }
        }
      } catch {
        // Ignore malformed JSON and proceed with query/form params.
      }
    }
  }

  return handleRequest(params, request.headers.get("x-api-key"));
}

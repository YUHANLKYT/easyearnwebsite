import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { buildPendingEarnNotice, getOfferPendingDays, getPendingUntil } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

const OFFERWALL_NAME = "BitLabs";

type ParsedPostback = {
  tx: string | null;
  userId: string | null;
  amountUsdCents: number | null;
  amountCurrencyCents: number | null;
  offerId: string | null;
  offerTitle: string | null;
  type: string | null;
  hash: string | null;
};

function getParam(searchParams: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
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

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeHash(value: string): string {
  return value.trim().toLowerCase();
}

function decodeIfPossible(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getHashCandidates(rawUrl: string): string[] {
  const parsed = new URL(rawUrl);
  const queryRaw = rawUrl.split("?")[1]?.split("#")[0] ?? "";
  const filteredQueryParts = queryRaw
    .split("&")
    .filter((part) => part.length > 0)
    .filter((part) => !part.toLowerCase().startsWith("hash="));
  const rawQueryWithoutHash = filteredQueryParts.join("&");
  const canonicalQueryWithoutHash = new URLSearchParams(rawQueryWithoutHash).toString();
  const originPath = `${parsed.origin}${parsed.pathname}`;
  const hostPath = `${parsed.host}${parsed.pathname}`;

  const baseCandidates = [
    originPath,
    hostPath,
    parsed.pathname,
    rawQueryWithoutHash,
    canonicalQueryWithoutHash,
    rawQueryWithoutHash ? `${originPath}?${rawQueryWithoutHash}` : originPath,
    canonicalQueryWithoutHash ? `${originPath}?${canonicalQueryWithoutHash}` : originPath,
    rawQueryWithoutHash ? `${hostPath}?${rawQueryWithoutHash}` : hostPath,
    canonicalQueryWithoutHash ? `${hostPath}?${canonicalQueryWithoutHash}` : hostPath,
    rawQueryWithoutHash ? `${parsed.pathname}?${rawQueryWithoutHash}` : parsed.pathname,
    canonicalQueryWithoutHash ? `${parsed.pathname}?${canonicalQueryWithoutHash}` : parsed.pathname,
  ];

  return Array.from(
    new Set(
      baseCandidates
        .flatMap((candidate) => [candidate, decodeIfPossible(candidate)])
        .map((candidate) => candidate.trim())
        .filter((candidate) => candidate.length > 0),
    ),
  );
}

function verifyHash(payload: ParsedPostback, rawUrl: string): boolean {
  const secrets = [
    process.env.BITLABS_POSTBACK_SECRET?.trim(),
    process.env.BITLABS_APP_SECRET?.trim(),
    process.env.BITLABS_SECRET_KEY?.trim(),
    process.env.BITLABS_SERVER_TO_SERVER_KEY?.trim(),
  ].filter((value): value is string => Boolean(value));

  if (secrets.length === 0) {
    // Allow integration to run until secret is configured in production.
    return true;
  }

  if (!payload.hash) {
    return false;
  }

  const incomingHash = normalizeHash(payload.hash);
  if (!incomingHash) {
    return false;
  }

  const hashBaseCandidates = getHashCandidates(rawUrl);

  for (const secret of secrets) {
    for (const hashBase of hashBaseCandidates) {
      const expectedHash = normalizeHash(createHmac("sha1", secret).update(hashBase).digest("hex"));
      if (safeEquals(incomingHash, expectedHash)) {
        return true;
      }
    }
  }

  return false;
}

function parsePostback(searchParams: URLSearchParams): ParsedPostback {
  return {
    tx: getParam(searchParams, ["tx", "trans_id", "transaction_id", "transactionId"]),
    userId: getParam(searchParams, ["uid", "user_id", "ext_user_id", "userid"]),
    amountUsdCents: parseCents(
      getParam(searchParams, ["raw", "amount_usd", "value_usd", "usd", "amount", "sub_id2", "subid_2"]),
      true,
    ),
    amountCurrencyCents: parseCents(getParam(searchParams, ["val", "amount_local", "value", "value_currency"]), true),
    offerId: getParam(searchParams, ["offer_task_id", "offer_id", "survey_id", "campaign_id", "task_id", "sub_id", "subid"]),
    offerTitle: getParam(searchParams, ["offer_task_name", "offer_title", "offer_name", "survey_name"]),
    type: getParam(searchParams, ["type", "status", "event"]),
    hash: getParam(searchParams, ["hash"]),
  };
}

async function handleCredit(payload: ParsedPostback, payoutCents: number) {
  if (!payload.tx || !payload.userId) {
    return NextResponse.json({ ok: false, error: "Missing tx or uid." }, { status: 400 });
  }

  if (payoutCents < 1) {
    return NextResponse.json({ ok: true, ignored: "Non-positive amount." });
  }

  const now = new Date();
  const taskKey = `bitlabs:${payload.tx}`;
  const pendingDays = getOfferPendingDays(payoutCents);
  const pendingUntil = getPendingUntil(payoutCents, now);
  const normalizedOfferId = payload.offerId ?? payload.tx;
  const offerTitle = payload.offerTitle ?? "BitLabs Offer";

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
            description: `${buildPendingEarnNotice(payoutCents, pendingDays)} (BitLabs tx: ${payload.tx})`,
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
          description: `BitLabs reward credited (tx: ${payload.tx})`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DUPLICATE") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ ok: true, ignored: "Unknown user." });
      }
      if (error.message === "USER_NOT_ACTIVE") {
        return NextResponse.json({ ok: true, ignored: "User is not active." });
      }
    }

    return NextResponse.json({ ok: false, error: "Could not process BitLabs reward." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited: true });
}

async function handleReversal(payload: ParsedPostback) {
  if (!payload.tx) {
    return NextResponse.json({ ok: false, error: "Missing tx." }, { status: 400 });
  }

  const taskKey = `bitlabs:${payload.tx}`;
  const reversalDescription = `BitLabs reward reversed (tx: ${payload.tx})`;
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
            description: `BitLabs pending reward canceled (tx: ${payload.tx})`,
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
        return NextResponse.json({ ok: true, ignored: "No claim found for reversal." });
      }
      if (error.message === "ALREADY_REVERSED") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ ok: true, ignored: "User not found for reversal." });
      }
    }

    return NextResponse.json({ ok: false, error: "Could not process BitLabs reversal." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reversed: true });
}

function buildRawUrlFromParams(request: Request, params: URLSearchParams): string {
  const baseUrl = new URL(request.url);
  const root = `${baseUrl.origin}${baseUrl.pathname}`;
  const query = params.toString();
  return query.length > 0 ? `${root}?${query}` : root;
}

async function handleRequest(params: URLSearchParams, rawUrl: string) {
  const payload = parsePostback(params);
  const isDebugCallback = params.get("debug")?.trim().toLowerCase() === "true";

  if (isDebugCallback) {
    const hashValid = verifyHash(payload, rawUrl);
    return NextResponse.json({
      ok: true,
      debug: true,
      hashValid,
      ignored: "Debug callback accepted without wallet credit.",
    });
  }

  if (!payload.tx || !payload.userId) {
    return NextResponse.json({ ok: false, error: "Missing required parameters." }, { status: 400 });
  }

  if (!verifyHash(payload, rawUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid hash." }, { status: 401 });
  }

  const payoutCents = payload.amountUsdCents ?? payload.amountCurrencyCents;
  if (payoutCents === null) {
    return NextResponse.json({ ok: false, error: "Missing reward value." }, { status: 400 });
  }

  const normalizedType = payload.type?.trim().toLowerCase();
  if (payoutCents < 0 || normalizedType === "reversal" || normalizedType === "chargeback") {
    return handleReversal(payload);
  }

  return handleCredit(payload, payoutCents);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleRequest(url.searchParams, request.url);
}

export async function POST(request: Request) {
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

  return handleRequest(params, buildRawUrlFromParams(request, params));
}

import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { buildPendingEarnNotice, getOfferPendingDays, getPendingUntil } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

const OFFERWALL_NAME = "AdGem";

type ParsedPostback = {
  playerId: string | null;
  transactionId: string | null;
  requestId: string | null;
  verifier: string | null;
  state: string | null;
  payoutCents: number | null;
  amountCents: number | null;
  goalId: string | null;
  goalName: string | null;
  offerId: string | null;
  offerName: string | null;
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

function normalizeHash(value: string): string {
  return value.trim().toLowerCase();
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeIfPossible(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripQueryKeys(rawUrl: string, keysToStrip: Set<string>): string {
  const hashIndex = rawUrl.indexOf("#");
  const trimmedUrl = hashIndex >= 0 ? rawUrl.slice(0, hashIndex) : rawUrl;
  const queryIndex = trimmedUrl.indexOf("?");
  if (queryIndex < 0) {
    return trimmedUrl;
  }

  const base = trimmedUrl.slice(0, queryIndex);
  const rawQuery = trimmedUrl.slice(queryIndex + 1);
  if (!rawQuery) {
    return base;
  }

  const filtered = rawQuery
    .split("&")
    .filter((part) => part.length > 0)
    .filter((part) => {
      const rawKey = part.split("=")[0] ?? "";
      const decodedKey = decodeIfPossible(rawKey).trim().toLowerCase();
      return !keysToStrip.has(decodedKey);
    });

  return filtered.length > 0 ? `${base}?${filtered.join("&")}` : base;
}

function verifySignature(rawUrl: string, verifier: string | null): boolean {
  const secret = process.env.ADGEM_POSTBACK_SECRET?.trim() || process.env.ADGEM_POSTBACK_KEY?.trim();

  if (!secret) {
    // Allow local/dev use if secret is not configured yet.
    return true;
  }

  if (!verifier) {
    return false;
  }

  const incoming = normalizeHash(verifier);
  if (!incoming) {
    return false;
  }

  const stripped = stripQueryKeys(rawUrl, new Set(["verifier"]));
  const candidates = Array.from(new Set([stripped, decodeIfPossible(stripped)])).filter((item) => item.length > 0);

  for (const candidate of candidates) {
    const expected = normalizeHash(createHmac("sha256", secret).update(candidate).digest("hex"));
    if (safeEquals(incoming, expected)) {
      return true;
    }
  }

  return false;
}

function parsePostback(searchParams: URLSearchParams): ParsedPostback {
  return {
    playerId: getParam(searchParams, ["player_id"]),
    transactionId: getParam(searchParams, ["transaction_id"]),
    requestId: getParam(searchParams, ["request_id"]),
    verifier: getParam(searchParams, ["verifier"]),
    state: getParam(searchParams, ["state"]),
    payoutCents: parseCents(getParam(searchParams, ["payout"]), true),
    amountCents: parseCents(getParam(searchParams, ["amount"]), true),
    goalId: getParam(searchParams, ["goal_id", "goalid"]),
    goalName: getParam(searchParams, ["goal_name", "goalname"]),
    offerId: getParam(searchParams, ["offer_id", "campaign_id"]),
    offerName: getParam(searchParams, ["offer_name"]),
  };
}

function shouldTreatAsReversal(payload: ParsedPostback, payoutCents: number | null): boolean {
  const state = payload.state?.toLowerCase() ?? "";
  if (payoutCents !== null && payoutCents < 0) {
    return true;
  }

  return (
    state.includes("reverse") ||
    state.includes("chargeback") ||
    state.includes("reject") ||
    state.includes("cancel") ||
    state.includes("fraud")
  );
}

function buildTaskKey(transactionId: string, goalId?: string | null): string {
  return `adgem:${transactionId}:${goalId?.trim() || "goal"}`;
}

async function handleCredit(payload: ParsedPostback, payoutCents: number) {
  if (!payload.transactionId || !payload.playerId) {
    return NextResponse.json({ ok: false, error: "Missing transaction_id or player_id." }, { status: 400 });
  }

  if (payoutCents < 1) {
    return NextResponse.json({ ok: true, ignored: "Non-positive amount." });
  }

  const now = new Date();
  const pendingDays = getOfferPendingDays(payoutCents);
  const pendingUntil = getPendingUntil(payoutCents, now);
  const taskKey = buildTaskKey(payload.transactionId, payload.goalId);
  const offerId = payload.offerId ?? payload.transactionId;
  const offerTitle = payload.goalName ?? payload.offerName ?? "AdGem Offer";

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: payload.playerId as string,
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
          offerId,
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
            description: `${buildPendingEarnNotice(payoutCents, pendingDays)} (AdGem tx: ${payload.transactionId})`,
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
          description: `AdGem reward credited (tx: ${payload.transactionId})`,
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

    return NextResponse.json({ ok: false, error: "Could not process AdGem reward." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited: true });
}

async function handleReversal(payload: ParsedPostback) {
  if (!payload.transactionId) {
    return NextResponse.json({ ok: false, error: "Missing transaction_id." }, { status: 400 });
  }

  const taskKey = buildTaskKey(payload.transactionId, payload.goalId);
  const reversalDescription = `AdGem reward reversed (tx: ${payload.transactionId})`;
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
            description: `AdGem pending reward canceled (tx: ${payload.transactionId})`,
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

    return NextResponse.json({ ok: false, error: "Could not process AdGem reversal." }, { status: 500 });
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
  const debugMode = params.get("debug")?.toLowerCase() === "true";

  if (debugMode) {
    return NextResponse.json({
      ok: true,
      debug: true,
      signatureValid: verifySignature(rawUrl, payload.verifier),
      parsed: payload,
    });
  }

  if (!payload.playerId || !payload.transactionId) {
    return NextResponse.json({ ok: false, error: "Missing required parameters." }, { status: 400 });
  }

  if (!verifySignature(rawUrl, payload.verifier)) {
    return NextResponse.json({ ok: false, error: "Invalid verifier." }, { status: 401 });
  }

  const payoutCents = payload.payoutCents ?? payload.amountCents;
  if (payoutCents === null) {
    return NextResponse.json({ ok: false, error: "Missing payout amount." }, { status: 400 });
  }

  if (shouldTreatAsReversal(payload, payoutCents)) {
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

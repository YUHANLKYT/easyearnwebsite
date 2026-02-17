import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { buildPendingEarnNotice, getOfferPendingDays, getPendingUntil } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

const OFFERWALL_NAME = "CPX Research";
const REVERSED_STATUS = -2;

type ParsedPostback = {
  status: number | null;
  transId: string | null;
  userId: string | null;
  subId: string | null;
  subId2: string | null;
  amountUsdCents: number | null;
  offerId: string | null;
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

function parseCents(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const cents = Math.round(amount * 100);
  return cents >= 0 ? cents : null;
}

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
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

function verifyHash(payload: ParsedPostback): boolean {
  const secret = process.env.CPX_POSTBACK_SECRET?.trim();
  if (!secret) {
    // Allow integration to run without verification until secret is configured.
    return true;
  }

  if (!payload.hash || !payload.userId || !payload.transId) {
    return false;
  }

  const incomingHash = normalizeHash(payload.hash);
  const candidates = [
    normalizeHash(secret),
    md5(`${payload.userId}-${secret}`),
    md5(`${payload.transId}-${secret}`),
    md5(`${payload.userId}${secret}`),
    md5(`${payload.transId}${secret}`),
  ];

  return candidates.some((candidate) => safeEquals(incomingHash, candidate));
}

function parsePostback(searchParams: URLSearchParams): ParsedPostback {
  const statusRaw = getParam(searchParams, ["status"]);
  const status = statusRaw !== null ? Number.parseInt(statusRaw, 10) : null;

  return {
    status: Number.isNaN(status) ? null : status,
    transId: getParam(searchParams, ["trans_id", "transId"]),
    userId: getParam(searchParams, ["user_id", "ext_user_id", "userid"]),
    subId: getParam(searchParams, ["sub_id", "subid", "subid_1"]),
    subId2: getParam(searchParams, ["sub_id_2", "subid_2"]),
    amountUsdCents: parseCents(getParam(searchParams, ["amount_usd", "amount"])),
    offerId: getParam(searchParams, ["offer_id", "offer_ID"]),
    hash: getParam(searchParams, ["hash", "secure_hash"]),
  };
}

async function handleCredit(payload: ParsedPostback) {
  if (!payload.transId || !payload.userId) {
    return NextResponse.json({ ok: false, error: "Missing trans_id or user_id." }, { status: 400 });
  }

  if (payload.amountUsdCents === null || payload.amountUsdCents < 1) {
    return NextResponse.json({ ok: true, ignored: "Non-positive amount." });
  }

  const now = new Date();
  const taskKey = `cpx:${payload.transId}`;
  const pendingDays = getOfferPendingDays(payload.amountUsdCents);
  const pendingUntil = getPendingUntil(payload.amountUsdCents, now);
  const normalizedOfferId = payload.offerId ?? payload.transId;
  const offerTitle = payload.offerId ? `Survey ${payload.offerId}` : "Survey";

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
          payoutCents: payload.amountUsdCents as number,
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
            amountCents: payload.amountUsdCents as number,
            description: `${buildPendingEarnNotice(payload.amountUsdCents as number, pendingDays)} (CPX trans_id: ${payload.transId})`,
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
            increment: payload.amountUsdCents as number,
          },
          lifetimeEarnedCents: {
            increment: payload.amountUsdCents as number,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "EARN",
          amountCents: payload.amountUsdCents as number,
          description: `CPX reward credited (trans_id: ${payload.transId})`,
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

    return NextResponse.json({ ok: false, error: "Could not process CPX reward." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited: true });
}

async function handleReversal(payload: ParsedPostback) {
  if (!payload.transId) {
    return NextResponse.json({ ok: false, error: "Missing trans_id." }, { status: 400 });
  }

  const taskKey = `cpx:${payload.transId}`;
  const reversalDescription = `CPX reward reversed (trans_id: ${payload.transId})`;
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
            description: `CPX pending reward canceled (trans_id: ${payload.transId})`,
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

    return NextResponse.json({ ok: false, error: "Could not process CPX reversal." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reversed: true });
}

async function handleRequest(searchParams: URLSearchParams) {
  const payload = parsePostback(searchParams);

  if (!payload.transId || !payload.userId) {
    return NextResponse.json({ ok: false, error: "Missing required parameters." }, { status: 400 });
  }

  if (!verifyHash(payload)) {
    return NextResponse.json({ ok: false, error: "Invalid hash." }, { status: 401 });
  }

  if (payload.status === REVERSED_STATUS) {
    return handleReversal(payload);
  }

  return handleCredit(payload);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleRequest(url.searchParams);
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

  return handleRequest(params);
}

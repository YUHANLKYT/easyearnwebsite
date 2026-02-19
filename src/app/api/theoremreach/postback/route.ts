import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { buildPendingEarnNotice, getOfferPendingDays, getPendingUntil } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

const OFFERWALL_NAME = "TheoremReach";

type ParsedPostback = {
  tx: string | null;
  userId: string | null;
  amountUsdCents: number | null;
  amountCurrencyCents: number | null;
  offerId: string | null;
  offerTitle: string | null;
  type: string | null;
  result: string | null;
  hash: string | null;
  enc: string | null;
  apiKey: string | null;
};

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

function getHashCandidates(rawUrl: string): string[] {
  const stripped = stripQueryKeys(rawUrl, new Set(["hash", "enc", "signature"]));
  const parsed = new URL(stripped);
  const queryRaw = stripped.split("?")[1]?.split("#")[0] ?? "";
  const canonicalQuery = new URLSearchParams(queryRaw).toString();
  const originPath = `${parsed.origin}${parsed.pathname}`;
  const hostPath = `${parsed.host}${parsed.pathname}`;
  const hostVariants = new Set<string>([parsed.host]);
  if (parsed.host.startsWith("www.")) {
    hostVariants.add(parsed.host.slice(4));
  } else {
    hostVariants.add(`www.${parsed.host}`);
  }
  const protocolVariants = new Set<string>([parsed.protocol, "https:"]);

  const variantOrigins = Array.from(hostVariants).flatMap((host) =>
    Array.from(protocolVariants).map((protocol) => `${protocol}//${host}${parsed.pathname}`),
  );

  const baseCandidates = [
    stripped,
    originPath,
    hostPath,
    parsed.pathname,
    queryRaw,
    canonicalQuery,
    queryRaw ? `${originPath}?${queryRaw}` : originPath,
    canonicalQuery ? `${originPath}?${canonicalQuery}` : originPath,
    queryRaw ? `${hostPath}?${queryRaw}` : hostPath,
    canonicalQuery ? `${hostPath}?${canonicalQuery}` : hostPath,
    queryRaw ? `${parsed.pathname}?${queryRaw}` : parsed.pathname,
    canonicalQuery ? `${parsed.pathname}?${canonicalQuery}` : parsed.pathname,
    ...variantOrigins,
    ...variantOrigins.map((origin) => (queryRaw ? `${origin}?${queryRaw}` : origin)),
    ...variantOrigins.map((origin) => (canonicalQuery ? `${origin}?${canonicalQuery}` : origin)),
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

function verifyApiKey(payload: ParsedPostback): boolean {
  const configuredToken = process.env.THEOREMREACH_APP_TOKEN?.trim();
  const configuredAppId = process.env.THEOREMREACH_APP_ID?.trim();
  if (!configuredToken && !configuredAppId) {
    return true;
  }

  if (!payload.apiKey) {
    return true;
  }

  const candidates = [configuredToken, configuredAppId]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => [value, Buffer.from(value).toString("base64")]);

  return candidates.some((candidate) => safeEquals(payload.apiKey as string, candidate));
}

function verifySignature(payload: ParsedPostback, rawUrl: string): boolean {
  const secrets = [
    process.env.THEOREMREACH_POSTBACK_SECRET?.trim(),
    process.env.THEOREMREACH_APP_SECRET?.trim(),
    process.env.THEOREMREACH_SERVER_TO_SERVER_KEY?.trim(),
  ].filter((value): value is string => Boolean(value));

  if (secrets.length === 0) {
    // Allow callback handling in non-production environments until keys are configured.
    return true;
  }

  const candidates = getHashCandidates(rawUrl);

  function shaAlgorithmsFor(value: string, secret: string) {
    return [
      normalizeHash(createHash("sha1").update(`${value}${secret}`).digest("hex")),
      normalizeHash(createHash("sha256").update(`${value}${secret}`).digest("hex")),
      normalizeHash(createHash("sha512").update(`${value}${secret}`).digest("hex")),
      normalizeHash(createHash("sha3-256").update(`${value}${secret}`).digest("hex")),
      normalizeHash(createHash("sha1").update(`${secret}${value}`).digest("hex")),
      normalizeHash(createHash("sha256").update(`${secret}${value}`).digest("hex")),
      normalizeHash(createHash("sha512").update(`${secret}${value}`).digest("hex")),
      normalizeHash(createHash("sha3-256").update(`${secret}${value}`).digest("hex")),
    ];
  }

  function hmacAlgorithmsFor(value: string, secret: string) {
    return [
      normalizeHash(createHmac("sha1", secret).update(value).digest("hex")),
      normalizeHash(createHmac("sha256", secret).update(value).digest("hex")),
      normalizeHash(createHmac("sha512", secret).update(value).digest("hex")),
      normalizeHash(createHmac("sha3-256", secret).update(value).digest("hex")),
    ];
  }

  const incomingEnc = payload.enc ? normalizeHash(payload.enc) : null;
  if (incomingEnc) {
    for (const secret of secrets) {
      for (const candidate of candidates) {
        const hashCandidates = [...shaAlgorithmsFor(candidate, secret), ...hmacAlgorithmsFor(candidate, secret)];
        if (hashCandidates.some((hashValue) => safeEquals(hashValue, incomingEnc))) {
          return true;
        }
      }
    }
  }

  const incomingHash = payload.hash ? normalizeHash(payload.hash) : null;
  if (incomingHash) {
    for (const secret of secrets) {
      for (const candidate of candidates) {
        const hashCandidates = [...shaAlgorithmsFor(candidate, secret), ...hmacAlgorithmsFor(candidate, secret)];
        if (hashCandidates.some((hashValue) => safeEquals(hashValue, incomingHash))) {
          return true;
        }
      }
    }
  }

  return false;
}

function parsePostback(searchParams: URLSearchParams): ParsedPostback {
  // Prefer explicit USD fields before generic amount fields.
  // Some providers include both `amount` and `amount_usd`; using USD first avoids mis-credit values.
  const amountUsdRaw = getParam(searchParams, [
    "amount_usd",
    "value_usd",
    "reward_usd",
    "reward_amount_usd",
    "sub_id2",
    "subid_2",
    "amount",
    "reward",
    "reward_amount",
    "raw",
  ]);
  const amountCurrencyRaw = getParam(searchParams, [
    "amount_local",
    "value_currency",
    "value",
    "val",
  ]);

  return {
    tx: getParam(searchParams, [
      "transaction_id",
      "trans_id",
      "tx",
      "tx_id",
      "transactionId",
      "event_id",
      "reward_id",
      "id",
    ]),
    userId: getParam(searchParams, [
      "user_id",
      "userid",
      "userId",
      "uid",
      "ext_user_id",
      "external_user_id",
      "external_id",
      "sub_id",
      "subid",
      "user",
      "playerid",
      "player_id",
    ]),
    amountUsdCents: parseCents(amountUsdRaw, true),
    amountCurrencyCents: parseCents(amountCurrencyRaw, true),
    offerId: getParam(searchParams, ["survey_id", "offer_id", "campaign_id", "task_id"]),
    offerTitle: getParam(searchParams, ["survey_name", "offer_name", "offer_title", "task_name"]),
    type: getParam(searchParams, ["type", "status", "event", "event_type"]),
    result: getParam(searchParams, ["result", "status_code", "event_status"]),
    hash: getParam(searchParams, ["hash"]),
    enc: getParam(searchParams, ["enc", "signature"]),
    apiKey: getParam(searchParams, ["api_key", "apikey", "app_token", "app_id"]),
  };
}

async function handleCredit(payload: ParsedPostback, payoutCents: number) {
  if (!payload.tx || !payload.userId) {
    return NextResponse.json({ ok: false, error: "Missing transaction_id or user_id." }, { status: 400 });
  }

  if (payoutCents < 1) {
    return NextResponse.json({ ok: true, ignored: "Non-positive amount." });
  }

  const now = new Date();
  const taskKey = `theoremreach:${payload.tx}`;
  const pendingDays = getOfferPendingDays(payoutCents);
  const pendingUntil = getPendingUntil(payoutCents, now);
  const normalizedOfferId = payload.offerId ?? payload.tx;
  const offerTitle = payload.offerTitle ?? "TheoremReach Survey";

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
            description: `${buildPendingEarnNotice(payoutCents, pendingDays)} (TheoremReach tx: ${payload.tx})`,
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
          description: `TheoremReach reward credited (tx: ${payload.tx})`,
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

    return NextResponse.json({ ok: false, error: "Could not process TheoremReach reward." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited: true });
}

async function handleReversal(payload: ParsedPostback) {
  if (!payload.tx) {
    return NextResponse.json({ ok: false, error: "Missing transaction_id." }, { status: 400 });
  }

  const taskKey = `theoremreach:${payload.tx}`;
  const reversalDescription = `TheoremReach reward reversed (tx: ${payload.tx})`;
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
            description: `TheoremReach pending reward canceled (tx: ${payload.tx})`,
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

    return NextResponse.json({ ok: false, error: "Could not process TheoremReach reversal." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reversed: true });
}

function buildRawUrlFromParams(request: Request, params: URLSearchParams): string {
  const baseUrl = new URL(request.url);
  const root = `${baseUrl.origin}${baseUrl.pathname}`;
  const query = params.toString();
  return query.length > 0 ? `${root}?${query}` : root;
}

function shouldTreatAsReversal(payload: ParsedPostback, payoutCents: number | null): boolean {
  const normalizedType = payload.type?.trim().toLowerCase() ?? "";
  const normalizedResult = payload.result?.trim().toLowerCase() ?? "";

  if (payoutCents !== null && payoutCents < 0) {
    return true;
  }

  if (normalizedType === "reversal" || normalizedType === "chargeback" || normalizedType === "cancel") {
    return true;
  }

  if (normalizedResult === "reversal" || normalizedResult === "chargeback" || normalizedResult === "cancel") {
    return true;
  }

  return normalizedResult === "3" || normalizedResult === "4" || normalizedResult === "5";
}

async function handleRequest(params: URLSearchParams, rawUrl: string) {
  const payload = parsePostback(params);
  const isDebugCallback = params.get("debug")?.trim().toLowerCase() === "true";

  if (isDebugCallback) {
    const hashValid = verifySignature(payload, rawUrl);
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

  if (!verifyApiKey(payload)) {
    return NextResponse.json({ ok: false, error: "Invalid API key." }, { status: 401 });
  }

  if (!verifySignature(payload, rawUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid hash." }, { status: 401 });
  }

  const payoutCents = payload.amountUsdCents ?? payload.amountCurrencyCents;
  if (shouldTreatAsReversal(payload, payoutCents)) {
    return handleReversal(payload);
  }

  if (payload.result && payload.result !== "10" && payoutCents === null) {
    return NextResponse.json({ ok: true, ignored: `Ignored callback result ${payload.result}.` });
  }

  if (payoutCents === null) {
    return NextResponse.json({ ok: false, error: "Missing reward value." }, { status: 400 });
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

  if (!formData) {
    const rawBody = await request.text().catch(() => "");
    if (rawBody.trim().length > 0) {
      const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType.includes("application/json")) {
        try {
          const payload = JSON.parse(rawBody) as Record<string, unknown>;
          Object.entries(payload).forEach(([key, value]) => {
            if (typeof value === "string" && value.length > 0) {
              params.set(key, value);
            }
            if (typeof value === "number" && Number.isFinite(value)) {
              params.set(key, String(value));
            }
          });
        } catch {
          // ignore invalid JSON body and continue with query/form params
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const bodyParams = new URLSearchParams(rawBody);
        for (const [key, value] of bodyParams.entries()) {
          if (value.length > 0) {
            params.set(key, value);
          }
        }
      }
    }
  }

  return handleRequest(params, buildRawUrlFromParams(request, params));
}

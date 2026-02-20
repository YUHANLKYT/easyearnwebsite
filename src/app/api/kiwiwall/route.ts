import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { buildPendingEarnNotice, getOfferPendingDays, getPendingUntil } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

const OFFERWALL_NAME = "KIWIWALL";
const PROVIDER_RESPONSE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "text/plain; charset=utf-8",
};

function providerAck(value: "1" | "0", status = 200) {
  return new NextResponse(value, {
    status,
    headers: PROVIDER_RESPONSE_HEADERS,
  });
}

type ParsedPostback = {
  tx: string | null;
  userId: string | null;
  subIdRaw: string | null;
  amountRaw: string | null;
  grossRaw: string | null;
  amountUsdCents: number | null;
  amountCurrencyCents: number | null;
  offerId: string | null;
  offerTitle: string | null;
  status: string | null;
  hash: string | null;
  apiToken: string | null;
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
  let normalized = value.trim();

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep the original value if URI decoding fails.
  }

  normalized = normalized
    .replace(/^[{(\["']+/, "")
    .replace(/[})\]"']+$/, "")
    .trim()
    .toLowerCase();

  return normalized;
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
  const stripped = stripQueryKeys(rawUrl, new Set(["hash", "signature", "sig", "secure_hash"]));
  const parsed = new URL(stripped);
  const queryRaw = stripped.split("?")[1]?.split("#")[0] ?? "";
  const canonicalQuery = new URLSearchParams(queryRaw).toString();
  const originPath = `${parsed.origin}${parsed.pathname}`;
  const hostPath = `${parsed.host}${parsed.pathname}`;

  const candidates = [
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
  ];

  return Array.from(
    new Set(
      candidates
        .flatMap((candidate) => [candidate, decodeIfPossible(candidate)])
        .map((candidate) => candidate.trim())
        .filter((candidate) => candidate.length > 0),
    ),
  );
}

function getBodyCandidates(rawBody: string): string[] {
  if (!rawBody) {
    return [""];
  }

  const trimmed = rawBody.trim();
  const candidates = [rawBody, trimmed];

  try {
    const parsed = JSON.parse(rawBody);
    candidates.push(JSON.stringify(parsed));
  } catch {
    // ignore invalid JSON
  }

  return Array.from(new Set(candidates.filter((candidate) => candidate.length > 0)));
}

function verifyApiToken(payload: ParsedPostback, headerApiToken?: string | null): boolean {
  const configuredToken = process.env.KIWIWALL_APP_TOKEN?.trim();
  const configuredAppId = process.env.KIWIWALL_APP_ID?.trim();
  if (!configuredToken && !configuredAppId) {
    return true;
  }

  const providedValues = [payload.apiToken, headerApiToken]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (providedValues.length < 1) {
    return false;
  }

  const candidates = [configuredToken, configuredAppId]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => [value, Buffer.from(value).toString("base64")]);

  for (const provided of providedValues) {
    if (candidates.some((candidate) => safeEquals(provided, candidate))) {
      return true;
    }
  }

  return false;
}

function verifyHash(payload: ParsedPostback, rawUrl: string, rawBody: string): boolean {
  const secrets = [
    process.env.KIWIWALL_POSTBACK_SECRET?.trim(),
    process.env.KIWIWALL_APP_SECRET?.trim(),
    process.env.KIWIWALL_SERVER_TO_SERVER_KEY?.trim(),
    process.env.KIWIWALL_SECRET_KEY?.trim(),
  ].filter((value): value is string => Boolean(value));

  if (secrets.length === 0) {
    // Allow setup to run until a secret is configured.
    return true;
  }

  if (!payload.hash) {
    return false;
  }

  const incomingHash = normalizeHash(payload.hash);
  if (!incomingHash || incomingHash === "secure_hash" || incomingHash === "generated_hash") {
    return false;
  }

  // KiwiWall documented signature: md5(sub_id:amount:secret_key)
  // We support both `amount` and `gross` as value candidates to avoid formatting drift across integrations.
  const kiwiSubId = payload.subIdRaw?.trim();
  const kiwiAmount = payload.amountRaw?.trim();
  const kiwiGross = payload.grossRaw?.trim();
  if (kiwiSubId && (kiwiAmount || kiwiGross)) {
    for (const secret of secrets) {
      const formulaCandidates = [kiwiAmount, kiwiGross]
        .filter((value): value is string => Boolean(value))
        .flatMap((value) => [
          createHash("md5").update(`${kiwiSubId}:${value}:${secret}`).digest("hex"),
          createHash("md5").update(`${decodeIfPossible(kiwiSubId)}:${value}:${secret}`).digest("hex"),
        ])
        .map(normalizeHash);

      if (formulaCandidates.some((candidate) => safeEquals(candidate, incomingHash))) {
        return true;
      }
    }
  }

  const urlCandidates = getHashCandidates(rawUrl);
  const bodyCandidates = getBodyCandidates(rawBody);
  const signatureInputs = Array.from(
    new Set(
      urlCandidates.flatMap((candidate) => {
        const combined = [candidate];
        for (const bodyCandidate of bodyCandidates) {
          combined.push(`${candidate}${bodyCandidate}`);
        }
        return combined;
      }),
    ),
  );

  const directInputs = [payload.tx, payload.userId, payload.status]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim());
  const payoutValue = payload.amountUsdCents ?? payload.amountCurrencyCents;
  if (payoutValue !== null) {
    directInputs.push(String(payoutValue / 100));
    directInputs.push(String(payoutValue));
  }
  const compactInput = directInputs.join(":");

  for (const secret of secrets) {
    for (const signatureInput of signatureInputs) {
      const hmacCandidates = [
        createHmac("sha1", secret).update(signatureInput).digest("hex"),
        createHmac("sha256", secret).update(signatureInput).digest("hex"),
        createHmac("sha512", secret).update(signatureInput).digest("hex"),
      ];

      const hashCandidates = [
        createHash("md5").update(`${signatureInput}${secret}`).digest("hex"),
        createHash("md5").update(`${secret}${signatureInput}`).digest("hex"),
        createHash("sha1").update(`${signatureInput}${secret}`).digest("hex"),
        createHash("sha256").update(`${signatureInput}${secret}`).digest("hex"),
      ];

      const allCandidates = [...hmacCandidates, ...hashCandidates].map(normalizeHash);
      if (allCandidates.some((candidate) => safeEquals(candidate, incomingHash))) {
        return true;
      }
    }

    if (compactInput.length > 0) {
      const compactCandidates = [
        createHash("md5").update(`${compactInput}:${secret}`).digest("hex"),
        createHash("md5").update(`${secret}:${compactInput}`).digest("hex"),
        createHmac("sha1", secret).update(compactInput).digest("hex"),
        createHmac("sha256", secret).update(compactInput).digest("hex"),
      ].map(normalizeHash);

      if (compactCandidates.some((candidate) => safeEquals(candidate, incomingHash))) {
        return true;
      }
    }
  }

  return false;
}

function parsePostback(searchParams: URLSearchParams): ParsedPostback {
  return {
    tx: getParam(searchParams, [
      "tx",
      "transaction_id",
      "trans_id",
      "transactionId",
      "conversion_id",
      "event_id",
      "id",
    ]),
    userId: getParam(searchParams, [
      "user_id",
      "uid",
      "userid",
      "userId",
      "ext_user_id",
      "external_user_id",
      "player_id",
      "playerid",
      "sub_id",
      "subid",
    ]),
    subIdRaw: getParam(searchParams, ["sub_id", "subid", "user_id", "uid", "userid", "userId"]),
    amountRaw: getParam(searchParams, [
      "amount",
      "amount_usd",
      "payout",
      "reward",
      "value",
      "value_usd",
      "sub_id2",
      "subid_2",
    ]),
    grossRaw: getParam(searchParams, ["gross", "amount_local"]),
    amountUsdCents: parseCents(
      getParam(searchParams, [
        "amount_usd",
        "payout_usd",
        "reward_usd",
        "value_usd",
        "usd",
        "amount",
        "payout",
        "reward",
        "sub_id2",
        "subid_2",
      ]),
      true,
    ),
    amountCurrencyCents: parseCents(
      getParam(searchParams, [
        "amount_local",
        "value_currency",
        "value",
        "val",
      ]),
      true,
    ),
    offerId: getParam(searchParams, [
      "offer_id",
      "campaign_id",
      "goal_id",
      "task_id",
      "survey_id",
      "sub_id",
      "subid",
    ]),
    offerTitle: getParam(searchParams, [
      "offer_name",
      "offer_title",
      "campaign_name",
      "goal_name",
      "task_name",
      "survey_name",
    ]),
    status: getParam(searchParams, ["status", "type", "event", "result", "event_type"]),
    hash: getParam(searchParams, ["hash", "signature", "sig", "secure_hash"]),
    apiToken: getParam(searchParams, ["api_key", "apikey", "app_token", "app_id", "appid"]),
  };
}

async function handleCredit(payload: ParsedPostback, payoutCents: number) {
  if (!payload.tx || !payload.userId) {
    return providerAck("0");
  }

  if (payoutCents < 1) {
    return providerAck("1");
  }

  const now = new Date();
  const taskKey = `kiwiwall:${payload.tx}`;
  const pendingDays = getOfferPendingDays(payoutCents);
  const pendingUntil = getPendingUntil(payoutCents, now);
  const normalizedOfferId = payload.offerId ?? payload.tx;
  const offerTitle = payload.offerTitle ?? "KIWIWALL Offer";

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
            description: `${buildPendingEarnNotice(payoutCents, pendingDays)} (KIWIWALL tx: ${payload.tx})`,
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
          description: `KIWIWALL reward credited (tx: ${payload.tx})`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DUPLICATE") {
        return providerAck("1");
      }
      if (error.message === "USER_NOT_FOUND") {
        return providerAck("1");
      }
      if (error.message === "USER_NOT_ACTIVE") {
        return providerAck("1");
      }
    }

    return providerAck("0", 500);
  }

  return providerAck("1");
}

async function handleReversal(payload: ParsedPostback) {
  if (!payload.tx) {
    return providerAck("0");
  }

  const taskKey = `kiwiwall:${payload.tx}`;
  const reversalDescription = `KIWIWALL reward reversed (tx: ${payload.tx})`;
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
            description: `KIWIWALL pending reward canceled (tx: ${payload.tx})`,
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
        return providerAck("1");
      }
      if (error.message === "ALREADY_REVERSED") {
        return providerAck("1");
      }
      if (error.message === "USER_NOT_FOUND") {
        return providerAck("1");
      }
    }

    return providerAck("0", 500);
  }

  return providerAck("1");
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

function buildRawUrlFromParams(request: Request, params: URLSearchParams): string {
  const baseUrl = new URL(request.url);
  const root = `${baseUrl.origin}${baseUrl.pathname}`;
  const query = params.toString();
  return query.length > 0 ? `${root}?${query}` : root;
}

async function handleRequest(
  params: URLSearchParams,
  rawUrl: string,
  rawBody: string,
  headerApiToken?: string | null,
) {
  const payload = parsePostback(params);
  const isDebugCallback = params.get("debug")?.trim().toLowerCase() === "true";

  if (isDebugCallback) {
    return NextResponse.json({
      ok: true,
      debug: true,
      hashValid: verifyHash(payload, rawUrl, rawBody),
      tokenValid: verifyApiToken(payload, headerApiToken),
      ignored: "Debug callback accepted without wallet credit.",
    });
  }

  if (!payload.tx || !payload.userId) {
    return providerAck("0");
  }

  if (!verifyHash(payload, rawUrl, rawBody)) {
    return providerAck("0");
  }

  const payoutCents = payload.amountUsdCents ?? payload.amountCurrencyCents;
  if (shouldTreatAsReversal(payload, payoutCents)) {
    return handleReversal(payload);
  }

  if (payoutCents === null) {
    return providerAck("0");
  }

  return handleCredit(payload, payoutCents);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleRequest(url.searchParams, request.url, "", request.headers.get("x-api-key"));
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
    if (contentType.includes("application/json")) {
      try {
        const payload = JSON.parse(rawBody) as Record<string, unknown>;
        for (const [key, value] of Object.entries(payload)) {
          if (typeof value === "string" && value.length > 0) {
            params.set(key, value);
          }
          if (typeof value === "number" && Number.isFinite(value)) {
            params.set(key, String(value));
          }
        }
      } catch {
        // ignore invalid JSON
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

  return handleRequest(
    params,
    buildRawUrlFromParams(request, params),
    rawBody,
    request.headers.get("x-api-key"),
  );
}


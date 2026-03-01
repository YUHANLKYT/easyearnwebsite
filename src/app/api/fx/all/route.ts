import { NextResponse } from "next/server";

const fallbackRates: Record<string, number> = {
  USD: 1,
  AUD: 1.53,
  GBP: 0.79,
};

type FxResponse = {
  rates?: Record<string, number>;
  time_last_update_unix?: number;
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("FX_FETCH_FAILED");
    }

    const payload = (await response.json()) as FxResponse;
    if (!payload.rates || !payload.rates.USD) {
      throw new Error("FX_INVALID_PAYLOAD");
    }

    return NextResponse.json({
      base: "USD",
      rates: payload.rates,
      updatedAt: payload.time_last_update_unix
        ? new Date(payload.time_last_update_unix * 1000).toISOString()
        : new Date().toISOString(),
      live: true,
    });
  } catch {
    return NextResponse.json({
      base: "USD",
      rates: fallbackRates,
      updatedAt: new Date().toISOString(),
      live: false,
    });
  }
}


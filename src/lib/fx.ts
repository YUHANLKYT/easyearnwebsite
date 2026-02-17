import { PAYOUT_REGION_TO_CURRENCY, type PayoutCurrency, type PayoutRegion } from "@/lib/constants";

const fallbackRates: Record<PayoutCurrency, number> = {
  USD: 1,
  AUD: 1.53,
  GBP: 0.79,
};

type FxResponse = {
  rates?: Record<string, number>;
  time_last_update_unix?: number;
};

export type UsdFxData = {
  rates: Record<PayoutCurrency, number>;
  updatedAt: string;
  live: boolean;
};

export function getCurrencyForRegion(region: PayoutRegion): PayoutCurrency {
  return PAYOUT_REGION_TO_CURRENCY[region];
}

export function getFallbackUsdFxData(): UsdFxData {
  return {
    rates: fallbackRates,
    updatedAt: new Date().toISOString(),
    live: false,
  };
}

export function convertFaceCentsToUsdCents(
  faceValueCents: number,
  payoutCurrency: PayoutCurrency,
  rates: Record<PayoutCurrency, number>,
): number {
  if (payoutCurrency === "USD") {
    return faceValueCents;
  }

  const rate = rates[payoutCurrency];
  if (!rate || rate <= 0) {
    return Math.round(faceValueCents / fallbackRates[payoutCurrency]);
  }

  return Math.round(faceValueCents / rate);
}

export async function getUsdFxData(): Promise<UsdFxData> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("FX_FETCH_FAILED");
    }

    const payload = (await response.json()) as FxResponse;
    const aud = payload.rates?.AUD;
    const gbp = payload.rates?.GBP;
    if (!aud || !gbp) {
      throw new Error("FX_INVALID_PAYLOAD");
    }

    return {
      rates: {
        USD: 1,
        AUD: aud,
        GBP: gbp,
      },
      updatedAt: payload.time_last_update_unix
        ? new Date(payload.time_last_update_unix * 1000).toISOString()
        : new Date().toISOString(),
      live: true,
    };
  } catch {
    return getFallbackUsdFxData();
  }
}

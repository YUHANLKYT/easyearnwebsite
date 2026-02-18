"use client";

import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaAmazon,
  FaApple,
  FaGooglePlay,
  FaPaypal,
  FaPlaystation,
  FaSpotify,
  FaSteam,
  FaXbox,
} from "react-icons/fa";
import {
  SiDiscord,
  SiDoordash,
  SiLeagueoflegends,
  SiNetflix,
  SiNintendo,
  SiRoblox,
  SiStarbucks,
  SiValorant,
} from "react-icons/si";

import {
  getAmountChoiceLabelsForRegion,
  getAmountChoicesForRegion,
  PAYOUT_REGION_TO_CURRENCY,
  type PayoutCurrency,
  type PayoutRegion,
  type RedemptionMethod,
  type RedemptionOption,
} from "@/lib/constants";
import { formatUSD } from "@/lib/money";

type StoreRedemptionGridProps = {
  options: RedemptionOption[];
  canRedeem: boolean;
};

type Region = {
  code: PayoutRegion;
  label: string;
  currency: PayoutCurrency;
  locale: string;
};

type FxState = {
  rates: Record<PayoutCurrency, number>;
  updatedAt: string | null;
  live: boolean;
};

const REGIONS: Region[] = [
  { code: "US", label: "US", currency: "USD", locale: "en-US" },
  { code: "AUS", label: "AUS", currency: "AUD", locale: "en-AU" },
  { code: "UK", label: "UK", currency: "GBP", locale: "en-GB" },
];

const defaultFxState: FxState = {
  rates: {
    USD: 1,
    AUD: 1.53,
    GBP: 0.79,
  },
  updatedAt: null,
  live: false,
};

const visualByMethod: Record<
  RedemptionMethod,
  {
    icon: IconType;
    gradient: string;
    orb: string;
  }
> = {
  PAYPAL: { icon: FaPaypal, gradient: "from-sky-600 to-blue-700", orb: "bg-sky-300/50" },
  APPLE_GIFT_CARD: { icon: FaApple, gradient: "from-slate-700 to-slate-900", orb: "bg-slate-300/50" },
  AMAZON_GIFT_CARD: { icon: FaAmazon, gradient: "from-amber-400 to-orange-500", orb: "bg-amber-300/55" },
  GOOGLE_PLAY_GIFT_CARD: { icon: FaGooglePlay, gradient: "from-emerald-500 to-cyan-500", orb: "bg-cyan-300/50" },
  SPOTIFY_GIFT_CARD: { icon: FaSpotify, gradient: "from-emerald-500 to-green-600", orb: "bg-emerald-300/50" },
  NETFLIX_GIFT_CARD: { icon: SiNetflix, gradient: "from-rose-500 to-red-600", orb: "bg-rose-300/55" },
  PLAYSTATION_GIFT_CARD: { icon: FaPlaystation, gradient: "from-indigo-500 to-violet-600", orb: "bg-violet-300/55" },
  NINTENDO_GIFT_CARD: { icon: SiNintendo, gradient: "from-red-500 to-rose-600", orb: "bg-red-300/55" },
  XBOX_GIFT_CARD: { icon: FaXbox, gradient: "from-emerald-500 to-teal-600", orb: "bg-emerald-300/50" },
  STARBUCKS_GIFT_CARD: { icon: SiStarbucks, gradient: "from-green-600 to-emerald-700", orb: "bg-green-300/50" },
  DOORDASH_GIFT_CARD: { icon: SiDoordash, gradient: "from-orange-500 to-rose-500", orb: "bg-orange-300/55" },
  STEAM_GIFT_CARD: { icon: FaSteam, gradient: "from-sky-500 to-indigo-500", orb: "bg-sky-300/55" },
  VALORANT_GIFT_CARD: { icon: SiValorant, gradient: "from-rose-500 to-red-700", orb: "bg-rose-300/55" },
  LEAGUE_OF_LEGENDS_GIFT_CARD: {
    icon: SiLeagueoflegends,
    gradient: "from-sky-600 to-indigo-700",
    orb: "bg-sky-300/55",
  },
  DISCORD_NITRO: { icon: SiDiscord, gradient: "from-indigo-500 to-blue-600", orb: "bg-indigo-300/55" },
  ROBLOX_GIFT_CARD: { icon: SiRoblox, gradient: "from-slate-600 to-slate-800", orb: "bg-slate-300/45" },
  VISA_GIFT_CARD: { icon: FaPaypal, gradient: "from-blue-600 to-sky-500", orb: "bg-sky-300/50" },
};

function formatCurrency(cents: number, currency: PayoutCurrency, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function convertFaceToUsdCents(faceCents: number, currency: PayoutCurrency, rates: Record<PayoutCurrency, number>): number {
  if (currency === "USD") {
    return faceCents;
  }
  const rate = rates[currency] ?? 1;
  return Math.max(1, Math.round(faceCents / rate));
}

export function StoreRedemptionGrid({ options, canRedeem }: StoreRedemptionGridProps) {
  const [selectedRegionCode, setSelectedRegionCode] = useState<PayoutRegion>("US");
  const [fxState, setFxState] = useState<FxState>(defaultFxState);
  const [selectedAmountByMethod, setSelectedAmountByMethod] = useState<Record<string, number>>(
    Object.fromEntries(options.map((option) => [option.method, option.amountChoicesCents[0] ?? option.minAmountCents])),
  );

  useEffect(() => {
    let mounted = true;

    async function loadRates() {
      try {
        const response = await fetch("/api/fx", { cache: "no-store" });
        const payload = (await response.json()) as {
          rates?: Record<PayoutCurrency, number>;
          updatedAt?: string;
          live?: boolean;
        };
        if (!mounted || !payload?.rates) {
          return;
        }

        setFxState({
          rates: {
            USD: payload.rates.USD ?? 1,
            AUD: payload.rates.AUD ?? defaultFxState.rates.AUD,
            GBP: payload.rates.GBP ?? defaultFxState.rates.GBP,
          },
          updatedAt: payload.updatedAt ?? null,
          live: Boolean(payload.live),
        });
      } catch {
        if (!mounted) {
          return;
        }
        setFxState(defaultFxState);
      }
    }

    loadRates();
    const interval = setInterval(loadRates, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const selectedRegion = useMemo(
    () => REGIONS.find((region) => region.code === selectedRegionCode) ?? REGIONS[0],
    [selectedRegionCode],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Payout Region</p>
          <p className="text-sm text-slate-600">Gift card face value uses this region currency. Wallet remains in USD.</p>
        </div>
        <div className="flex items-center gap-2">
          {REGIONS.map((region) => (
            <button
              key={region.code}
              type="button"
              onClick={() => setSelectedRegionCode(region.code)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedRegion.code === region.code
                  ? "store-chip-btn store-chip-selected shadow-sm"
                  : "store-chip-btn store-chip-idle"
              }`}
            >
              {region.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        FX source: {fxState.live ? "Live rate" : "Fallback rate"} -{" "}
        {fxState.updatedAt
          ? new Date(fxState.updatedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "Just now"}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {options.map((option) => {
          const visual = visualByMethod[option.method];
          const Icon = visual.icon;
          const supportedRegions = option.supportedRegions ?? REGIONS.map((region) => region.code);
          const optionRegion =
            supportedRegions.includes(selectedRegion.code)
              ? selectedRegion
              : (REGIONS.find((region) => region.code === supportedRegions[0]) ?? REGIONS[0]);
          const optionCurrency = PAYOUT_REGION_TO_CURRENCY[optionRegion.code];
          const amountChoicesForRegion = getAmountChoicesForRegion(option, optionRegion.code);
          const amountChoiceLabelsForRegion = getAmountChoiceLabelsForRegion(option, optionRegion.code);
          const selectedCandidate = selectedAmountByMethod[option.method];
          const fallbackFaceValueCents = amountChoicesForRegion[0] ?? option.minAmountCents;
          const selectedFaceValueCents =
            selectedCandidate && amountChoicesForRegion.includes(selectedCandidate)
              ? selectedCandidate
              : fallbackFaceValueCents;
          const minAmountForRegionCents =
            amountChoicesForRegion.length > 0 ? Math.min(...amountChoicesForRegion) : option.minAmountCents;
          const usdEquivalentCents = convertFaceToUsdCents(selectedFaceValueCents, optionCurrency, fxState.rates);

          return (
            <article key={option.method} className="overflow-hidden rounded-3xl border border-slate-100 bg-white/90 shadow-sm">
              <div className={`relative bg-gradient-to-r ${visual.gradient} px-4 py-4 text-white`}>
                <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${visual.orb}`} />
                <div className="relative flex items-center gap-3">
                  <span className="rounded-xl bg-white/15 p-2">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">{option.label}</h2>
                    <p className="text-xs text-white/85">{option.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <p className="text-xs text-slate-500">
                  Minimum: {formatCurrency(minAmountForRegionCents, optionCurrency, optionRegion.locale)} {optionCurrency}
                </p>
                <p className="text-xs text-slate-500">Select fixed amount</p>
                {optionRegion.code !== selectedRegion.code ? (
                  <p className="text-xs font-semibold text-amber-700">
                    This reward is available in {optionRegion.label} only ({optionCurrency}).
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {amountChoicesForRegion.map((amountCents) => {
                    const selected = selectedFaceValueCents === amountCents;
                    const usdValueCents = convertFaceToUsdCents(amountCents, optionCurrency, fxState.rates);
                    const amountLabel = amountChoiceLabelsForRegion?.[amountCents];
                    return (
                      <button
                        key={`${option.method}-${amountCents}`}
                        type="button"
                        onClick={() =>
                          setSelectedAmountByMethod((current) => ({
                            ...current,
                            [option.method]: amountCents,
                          }))
                        }
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          selected
                            ? "amount-choice amount-choice-active"
                            : "amount-choice amount-choice-idle"
                        }`}
                      >
                        {amountLabel ? <span className="mb-1 block text-[10px] font-bold tracking-wide">{amountLabel}</span> : null}
                        <span className="block leading-none">
                          {formatCurrency(amountCents, optionCurrency, optionRegion.locale)}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-slate-500">{formatUSD(usdValueCents)} USD</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-500">
                  You receive {formatCurrency(selectedFaceValueCents, optionCurrency, optionRegion.locale)} {optionCurrency}.
                  Wallet charge: {formatUSD(usdEquivalentCents)} USD.
                </p>

                <form action="/api/redeem" method="post" className="space-y-2">
                  <input type="hidden" name="method" value={option.method} />
                  <input type="hidden" name="region" value={optionRegion.code} />
                  <input type="hidden" name="redirectTo" value="/store" />
                  <input type="hidden" name="amount" value={(selectedFaceValueCents / 100).toFixed(2)} />
                  {option.method === "PAYPAL" ? (
                    <label className="block text-xs text-slate-600">
                      <span className="mb-1 block font-semibold text-slate-700">PayPal Email</span>
                      <input
                        name="payoutEmail"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                      />
                    </label>
                  ) : null}
                  {option.method === "DISCORD_NITRO" ? (
                    <label className="block text-xs text-slate-600">
                      <span className="mb-1 block font-semibold text-slate-700">Discord Username</span>
                      <input
                        name="discordUsername"
                        type="text"
                        required
                        placeholder="@username"
                        pattern="^@[A-Za-z0-9._]{2,32}$"
                        title="Enter your Discord username in @username format."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                      />
                    </label>
                  ) : null}
                  <button
                    type="submit"
                    disabled={!canRedeem}
                    className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {canRedeem ? `Redeem ${option.label}` : "Unavailable"}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

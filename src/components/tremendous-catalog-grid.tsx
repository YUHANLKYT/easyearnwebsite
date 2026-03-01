"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type TremendousCatalogEntry,
  isPopularTremendousProduct,
  isPrepaidTremendousProduct,
} from "@/lib/tremendous";

type TremendousCatalogGridProps = {
  entries: TremendousCatalogEntry[];
  canRedeem: boolean;
  detectedCountryName: string | null;
};

type FxAllState = {
  rates: Record<string, number>;
  live: boolean;
  updatedAt: string | null;
};

const AUD_MINIMUM = 5;

const defaultFxAllState: FxAllState = {
  rates: {
    USD: 1,
    AUD: 1.53,
    GBP: 0.79,
  },
  live: false,
  updatedAt: null,
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function toFaceCents(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100);
}

function toTwoDecimals(value: number): number {
  return Math.ceil(value * 100) / 100;
}

function getAudEquivalentMinimum(currency: string, rates: Record<string, number>): number {
  if (currency === "AUD") {
    return AUD_MINIMUM;
  }

  const audRate = rates.AUD;
  const currencyRate = rates[currency];
  if (!audRate || !currencyRate || audRate <= 0 || currencyRate <= 0) {
    return AUD_MINIMUM;
  }

  const usdAmount = AUD_MINIMUM / audRate;
  return toTwoDecimals(usdAmount * currencyRate);
}

function getEntryMinimum(entry: TremendousCatalogEntry, rates: Record<string, number>): number {
  const providerMinimum = entry.minAmount ?? 0;
  const audEquivalentMinimum = getAudEquivalentMinimum(entry.currency, rates);
  return toTwoDecimals(Math.max(providerMinimum, audEquivalentMinimum));
}

function getRegionScopedEntries(entries: TremendousCatalogEntry[], countryName: string | null): TremendousCatalogEntry[] {
  if (!countryName) {
    return entries;
  }
  const trimmed = countryName.trim();
  if (!trimmed) {
    return entries;
  }
  const filtered = entries.filter((entry) => entry.countries.includes(trimmed));
  return filtered.length > 0 ? filtered : entries;
}

export function TremendousCatalogGrid({ entries, canRedeem, detectedCountryName }: TremendousCatalogGridProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [fxState, setFxState] = useState<FxAllState>(defaultFxAllState);
  const [locationMode, setLocationMode] = useState<"AUTO" | "ALL">("AUTO");

  useEffect(() => {
    let mounted = true;
    async function loadFxRates() {
      try {
        const response = await fetch("/api/fx/all", { cache: "no-store" });
        const payload = (await response.json()) as {
          rates?: Record<string, number>;
          live?: boolean;
          updatedAt?: string;
        };
        if (!mounted || !payload.rates) {
          return;
        }
        setFxState({
          rates: payload.rates,
          live: Boolean(payload.live),
          updatedAt: payload.updatedAt ?? null,
        });
      } catch {
        if (!mounted) {
          return;
        }
        setFxState(defaultFxAllState);
      }
    }
    loadFxRates();
    return () => {
      mounted = false;
    };
  }, []);

  const scopedEntries = useMemo(() => {
    if (locationMode === "AUTO") {
      return getRegionScopedEntries(entries, detectedCountryName);
    }
    return entries;
  }, [detectedCountryName, entries, locationMode]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return scopedEntries;
    }
    return scopedEntries.filter((entry) => {
      const haystack = `${entry.product} ${entry.currency} ${entry.category}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, scopedEntries]);

  const grouped = useMemo(() => {
    const prepaid: TremendousCatalogEntry[] = [];
    const popular: TremendousCatalogEntry[] = [];
    const more: TremendousCatalogEntry[] = [];

    for (const entry of filteredEntries) {
      if (isPrepaidTremendousProduct(entry.product)) {
        prepaid.push(entry);
        continue;
      }
      if (isPopularTremendousProduct(entry.product)) {
        popular.push(entry);
        continue;
      }
      more.push(entry);
    }

    return { prepaid, popular, more };
  }, [filteredEntries]);

  const effectiveSelectedId =
    selectedId && filteredEntries.some((entry) => entry.id === selectedId) ? selectedId : (filteredEntries[0]?.id ?? null);

  const selectedEntry = useMemo(
    () => (effectiveSelectedId ? filteredEntries.find((entry) => entry.id === effectiveSelectedId) ?? null : null),
    [effectiveSelectedId, filteredEntries],
  );

  const selectedCurrency = selectedEntry?.currency ?? "USD";
  const selectedMinAmount = selectedEntry ? getEntryMinimum(selectedEntry, fxState.rates) : AUD_MINIMUM;
  const selectedMaxAmount = selectedEntry ? Math.max(selectedMinAmount, selectedEntry.maxAmount ?? 1000) : 1000;
  const resolvedAmountInput = selectedEntry ? amountInput || selectedMinAmount.toFixed(2) : "";
  const selectedFaceCents = selectedEntry ? toFaceCents(resolvedAmountInput) : null;
  const selectedRate = fxState.rates[selectedCurrency] ?? null;
  const estimatedUsdCents =
    selectedFaceCents && selectedRate && selectedRate > 0 ? Math.max(1, Math.round(selectedFaceCents / selectedRate)) : null;

  return (
    <section className="space-y-4 rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Redemption Store</h2>
          <p className="text-xs text-slate-500">
            Search gift cards by prepaid, popular, and more options. Catalog redemptions require at least A$5.00 equivalent.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          FX source: {fxState.live ? "Live" : "Fallback"}{" "}
          {fxState.updatedAt
            ? `- ${new Date(fxState.updatedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}`
            : ""}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search gift cards</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by brand, category, or currency (e.g. Amazon, Entertainment, AUD)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
          />
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
          <p className="mt-1 text-xs text-slate-600">
            {detectedCountryName ? `Detected by IP: ${detectedCountryName}` : "Detected by IP: Unknown"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocationMode("AUTO")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                locationMode === "AUTO"
                  ? "border border-sky-200 bg-sky-50 text-sky-700"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              Auto location
            </button>
            <button
              type="button"
              onClick={() => setLocationMode("ALL")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                locationMode === "ALL"
                  ? "border border-sky-200 bg-sky-50 text-sky-700"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              All countries
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Prepaid</h3>
            <p className="mt-1 text-xs text-emerald-700">{grouped.prepaid.length} options</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.prepaid.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(entry.id);
                    setAmountInput(getEntryMinimum(entry, fxState.rates).toFixed(2));
                  }}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    effectiveSelectedId === entry.id
                      ? "border-sky-300 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{entry.product}</p>
                  <p className="text-xs text-slate-500">{entry.currency}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/35 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-800">Popular Gift Cards</h3>
            <p className="mt-1 text-xs text-indigo-700">{grouped.popular.length} options</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.popular.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(entry.id);
                    setAmountInput(getEntryMinimum(entry, fxState.rates).toFixed(2));
                  }}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    effectiveSelectedId === entry.id
                      ? "border-sky-300 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{entry.product}</p>
                  <p className="text-xs text-slate-500">{entry.currency}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800">More Gift Cards</h3>
            <p className="mt-1 text-xs text-slate-600">{grouped.more.length} options</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.more.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(entry.id);
                    setAmountInput(getEntryMinimum(entry, fxState.rates).toFixed(2));
                  }}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    effectiveSelectedId === entry.id
                      ? "border-sky-300 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{entry.product}</p>
                  <p className="text-xs text-slate-500">{entry.currency}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Request Selected Gift Card</h3>
          {!selectedEntry ? (
            <p className="mt-2 text-sm text-slate-500">Select a catalog item to continue.</p>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEntry.product}</p>
              <p className="text-xs text-slate-500">
                {selectedEntry.currency} - {selectedEntry.category}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Available in {selectedEntry.countryCount} countries
                {detectedCountryName && selectedEntry.countries.includes(detectedCountryName)
                  ? ` (includes ${detectedCountryName})`
                  : ""}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Min: {formatMoney(selectedMinAmount, selectedEntry.currency)} (A$5.00 equivalent) | Max:{" "}
                {formatMoney(selectedMaxAmount, selectedEntry.currency)}
              </p>

              <form action="/api/redeem/tremendous" method="post" className="mt-4 space-y-3">
                <input type="hidden" name="catalogId" value={selectedEntry.id} />
                <input type="hidden" name="redirectTo" value="/store" />
                <label className="block text-xs text-slate-600">
                  <span className="mb-1 block font-semibold text-slate-700">Amount ({selectedEntry.currency})</span>
                  <input
                    name="amount"
                    type="number"
                    min={selectedMinAmount.toFixed(2)}
                    max={selectedMaxAmount.toFixed(2)}
                    step="0.01"
                    required
                    value={resolvedAmountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                  />
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {estimatedUsdCents ? (
                    <>
                      Estimated wallet charge: <span className="font-semibold text-slate-900">{formatMoney(estimatedUsdCents / 100, "USD")}</span>
                    </>
                  ) : selectedCurrency === "USD" && selectedFaceCents ? (
                    <>
                      Estimated wallet charge: <span className="font-semibold text-slate-900">{formatMoney(selectedFaceCents / 100, "USD")}</span>
                    </>
                  ) : (
                    <>
                      Unable to estimate USD conversion for {selectedCurrency} right now. You can still submit and the server
                      will validate before charging.
                    </>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!canRedeem}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {canRedeem ? "Submit Redemption Request" : "Unavailable"}
                </button>
              </form>
            </>
          )}
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/35 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800">Custom WD</h3>
          <p className="mt-1 text-xs text-slate-600">Request a custom payout item. Minimum request is $5.00 USD.</p>
        </div>
        <form action="/api/redeem/custom" method="post" className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="redirectTo" value="/store" />
          <label className="block text-xs text-slate-600 md:col-span-1">
            <span className="mb-1 block font-semibold text-slate-700">Name</span>
            <input
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={120}
              placeholder="Example: PSN 1 Month"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <label className="block text-xs text-slate-600 md:col-span-1">
            <span className="mb-1 block font-semibold text-slate-700">Price in USD</span>
            <input
              name="amount"
              type="number"
              required
              min="5"
              max="1000"
              step="0.01"
              placeholder="5.00"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <label className="block text-xs text-slate-600 md:col-span-1">
            <span className="mb-1 block font-semibold text-slate-700">Wallet / Email (optional)</span>
            <input
              name="destination"
              type="text"
              maxLength={160}
              placeholder="Optional payout wallet or email"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={!canRedeem}
              className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {canRedeem ? "Submit Custom WD" : "Unavailable"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

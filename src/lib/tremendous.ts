import catalog from "@/data/tremendous-catalog.json";

export type TremendousCatalogEntry = {
  id: string;
  product: string;
  currency: string;
  category: string;
  minAmount: number | null;
  maxAmount: number | null;
  countries: string[];
  countryCount: number;
};

const MONETARY_PRODUCT_PATTERN =
  /\b(bank transfer|cash app|paypal|venmo|wire transfer|wire|crypto|bitcoin|ach|moneygram|western union)\b/i;

const PREPAID_PRODUCT_PATTERN = /\b(prepaid|visa|mastercard)\b/i;
const CHARITY_NONPROFIT_PATTERN =
  /\b(charity|non[-\s]?profit|donation|foundation|ngo|relief|red cross|unicef|unhcr|wwf|save the children)\b/i;

const POPULAR_PRODUCT_PATTERNS = [
  /amazon/i,
  /apple/i,
  /google play/i,
  /steam/i,
  /xbox/i,
  /playstation/i,
  /nintendo/i,
  /roblox/i,
  /discord/i,
  /spotify/i,
  /netflix/i,
  /starbucks/i,
  /doordash/i,
  /valorant/i,
  /league of legends|riot/i,
  /fortnite/i,
];

function normalizeEntry(raw: unknown): TremendousCatalogEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const product = typeof value.product === "string" ? value.product.trim() : "";
  const currency = typeof value.currency === "string" ? value.currency.trim().toUpperCase() : "";
  const category = typeof value.category === "string" && value.category.trim() ? value.category.trim() : "General";
  if (!id || !product || !currency) {
    return null;
  }

  const minAmount =
    typeof value.minAmount === "number" && Number.isFinite(value.minAmount) && value.minAmount > 0 ? value.minAmount : null;
  const maxAmount =
    typeof value.maxAmount === "number" && Number.isFinite(value.maxAmount) && value.maxAmount > 0 ? value.maxAmount : null;
  const countries = Array.isArray(value.countries)
    ? value.countries.filter((country): country is string => typeof country === "string" && country.trim().length > 0)
    : [];

  return {
    id,
    product,
    currency,
    category,
    minAmount,
    maxAmount,
    countries,
    countryCount: typeof value.countryCount === "number" ? value.countryCount : countries.length,
  };
}

const normalizedCatalog: TremendousCatalogEntry[] = (catalog as unknown[])
  .map(normalizeEntry)
  .filter((entry): entry is TremendousCatalogEntry => Boolean(entry));

export function isMonetaryTremendousProduct(product: string): boolean {
  return MONETARY_PRODUCT_PATTERN.test(product);
}

export function isPrepaidTremendousProduct(product: string): boolean {
  return PREPAID_PRODUCT_PATTERN.test(product);
}

export function isPopularTremendousProduct(product: string): boolean {
  return POPULAR_PRODUCT_PATTERNS.some((pattern) => pattern.test(product));
}

export function isCharityNonProfitTremendousProduct(product: string, category?: string): boolean {
  return CHARITY_NONPROFIT_PATTERN.test(`${product} ${category ?? ""}`);
}

export function getTremendousCatalogEntries(): TremendousCatalogEntry[] {
  return normalizedCatalog.filter((entry) => !isMonetaryTremendousProduct(entry.product));
}

export function getTremendousCatalogEntryById(id: string): TremendousCatalogEntry | null {
  const cleanedId = id.trim();
  if (!cleanedId) {
    return null;
  }
  const match = normalizedCatalog.find((entry) => entry.id === cleanedId);
  if (!match || isMonetaryTremendousProduct(match.product)) {
    return null;
  }
  return match;
}

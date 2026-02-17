const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatUSD(cents: number): string {
  return usdFormatter.format(centsToDollars(cents));
}

export function parseDollarInputToCents(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

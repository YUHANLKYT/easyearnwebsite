import { headers } from "next/headers";
import Link from "next/link";

import { FlashMessage } from "@/components/flash-message";
import { TremendousCatalogGrid } from "@/components/tremendous-catalog-grid";
import { requireUser } from "@/lib/auth";
import { formatUSD } from "@/lib/money";
import { getTremendousCatalogEntries } from "@/lib/tremendous";

type SearchParams = Promise<{
  notice?: string;
  error?: string;
}>;

function getCountryNameFromCode(countryCode: string | null): string | null {
  if (!countryCode) {
    return null;
  }
  if (countryCode === "US") {
    return "USA";
  }
  if (countryCode === "AU") {
    return "Australia";
  }
  if (countryCode === "GB" || countryCode === "UK") {
    return "United Kingdom";
  }
  return null;
}

export default async function StorePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/store");
  const params = await searchParams;
  const requestHeaders = await headers();
  const ipCountryCode = requestHeaders.get("x-vercel-ip-country") ?? requestHeaders.get("cf-ipcountry");
  const detectedCountryName = getCountryNameFromCode(ipCountryCode);
  const canRedeem = user.status === "ACTIVE" && Boolean(user.emailVerifiedAt);
  const tremendousEntries = getTremendousCatalogEntries();

  return (
    <div className="space-y-6">
      <section className="page-hero rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Redemption Store</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Redeem your USD balance for gift cards and prepaid options. Custom WD is available at the bottom.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Location by IP: {detectedCountryName ?? "Unknown"} ({ipCountryCode ?? "N/A"}). Wallet balance always remains in
          USD.
        </p>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />

      {user.status !== "ACTIVE" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is currently {user.status.toLowerCase()}. Redemption requests are disabled.
        </div>
      ) : null}

      {!user.emailVerifiedAt ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Redemptions are disabled until your email is verified. Verify it from{" "}
          <Link href="/settings" className="font-semibold text-rose-700 underline hover:text-rose-900">
            Settings
          </Link>
          .
        </div>
      ) : null}

      <section className="rounded-3xl border border-sky-100 bg-sky-50/70 p-5">
        <p className="text-sm text-slate-600">Current wallet balance</p>
        <p className="mt-1 text-3xl font-semibold text-slate-900">{formatUSD(user.balanceCents)}</p>
        <p className="text-xs text-slate-500">USD</p>
      </section>

      <TremendousCatalogGrid entries={tremendousEntries} canRedeem={canRedeem} detectedCountryName={detectedCountryName} />
    </div>
  );
}

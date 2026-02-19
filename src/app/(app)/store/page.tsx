import { FlashMessage } from "@/components/flash-message";
import { StoreRedemptionGrid } from "@/components/store-redemption-grid";
import { requireUser } from "@/lib/auth";
import { REDEMPTION_OPTIONS, type PayoutCurrency, getRedemptionLabel } from "@/lib/constants";
import { formatUSD } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type SearchParams = Promise<{
  notice?: string;
  error?: string;
}>;

function getStatusLabel(status: "PENDING" | "APPROVED" | "SENT" | "CANCELED") {
  if (status === "PENDING") {
    return "PROCESSING";
  }
  return status;
}

function getStatusClass(status: "PENDING" | "APPROVED" | "SENT" | "CANCELED") {
  if (status === "PENDING") {
    return "text-rose-600";
  }
  if (status === "APPROVED") {
    return "text-sky-600";
  }
  if (status === "SENT") {
    return "text-emerald-600";
  }
  return "text-slate-500";
}

function formatPayoutCurrency(cents: number | null, currency: PayoutCurrency): string | null {
  if (cents === null) {
    return null;
  }

  const locale = currency === "AUD" ? "en-AU" : currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function StorePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/store");
  const params = await searchParams;
  const storeOptions = REDEMPTION_OPTIONS.filter((option) => option.method !== "VISA_GIFT_CARD");
  const canRedeem = user.status === "ACTIVE" && Boolean(user.emailVerifiedAt);

  const redemptions = await prisma.redemption.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });
  const activeRedemptions = redemptions.filter((redemption) => redemption.status === "PENDING" || redemption.status === "APPROVED");
  const withdrawalTransactions = redemptions.filter(
    (redemption) => redemption.status === "SENT" || redemption.status === "CANCELED",
  );

  return (
    <div className="space-y-6">
      <section className="page-hero rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Store & Withdrawals</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Redeem your USD balance for PayPal and gift cards. Every withdrawal made by your referrals pays you a 5% bonus.
        </p>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />
      {user.status !== "ACTIVE" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is currently {user.status.toLowerCase()}. Withdrawal requests are disabled.
        </div>
      ) : null}
      {!user.emailVerifiedAt ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Withdrawals are disabled until your email is verified. Verify it from{" "}
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

      <StoreRedemptionGrid options={storeOptions} canRedeem={canRedeem} />

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-slate-700">
        Custom Withdrawal is now built into the store grid. Add the item name, USD price, and optional wallet/email,
        then admin can approve with fulfillment details or decline with a reason.
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Withdrawal Queue</h2>
        <p className="mt-1 text-xs text-slate-500">Only active withdrawals are shown here.</p>
        <div className="mt-4 space-y-3">
          {activeRedemptions.length === 0 ? (
            <p className="text-sm text-slate-500">No active withdrawals in queue.</p>
          ) : (
            activeRedemptions.map((redemption) => (
              <details
                key={redemption.id}
                className="group rounded-xl border border-slate-100 bg-white px-3 py-3 open:border-sky-200 open:bg-sky-50/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{getRedemptionLabel(redemption.method)}</p>
                    <p className="text-xs text-slate-500">
                      {redemption.createdAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatPayoutCurrency(redemption.faceValueCents, redemption.payoutCurrency) ??
                        formatUSD(redemption.amountCents)}{" "}
                      {redemption.payoutCurrency} ({redemption.payoutRegion})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-rose-700">-{formatUSD(redemption.amountCents)}</p>
                    <p className={`text-xs font-semibold ${getStatusClass(redemption.status)}`}>
                      {getStatusLabel(redemption.status)}
                    </p>
                    <p className="text-[11px] font-medium text-sky-700 transition group-open:text-sky-900">
                      Click to view details
                    </p>
                  </div>
                </summary>
                <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-700">
                  {redemption.method === "CUSTOM_WITHDRAWAL" ? (
                    <>
                      <p className="font-semibold text-slate-800">
                        Request: {redemption.customName ?? "Custom item"} ({formatUSD(redemption.amountCents)})
                      </p>
                      {redemption.customDestination ? (
                        <p className="mt-1 text-slate-600">Wallet/Email: {redemption.customDestination}</p>
                      ) : null}
                      {redemption.status === "PENDING" ? (
                        <p className="mt-1 text-slate-600">Waiting for admin review.</p>
                      ) : null}
                      {redemption.status === "SENT" ? (
                        <p className="mt-1 font-semibold text-emerald-700">
                          Fulfillment: {redemption.customFulfillment ?? "Approved by admin"}
                        </p>
                      ) : null}
                      {redemption.status === "CANCELED" ? (
                        <p className="mt-1 font-semibold text-rose-700">
                          Declined: {redemption.customDeclineReason ?? "No reason provided."}
                        </p>
                      ) : null}
                    </>
                  ) : redemption.status !== "SENT" ? (
                    <p>
                      This withdrawal is currently <span className="font-semibold">{redemption.status}</span>. CODE will
                      appear here after admin marks it as sent.
                    </p>
                  ) : redemption.note ? (
                    <p className="font-semibold text-emerald-700">CODE: {redemption.note}</p>
                  ) : (
                    <p className="text-slate-600">No code required for this payout method.</p>
                  )}
                  {redemption.processedAt ? (
                    <p className="mt-1 text-slate-500">
                      Processed{" "}
                      {redemption.processedAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </div>
              </details>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Withdrawal Transactions</h2>
        <p className="mt-1 text-xs text-slate-500">Processed, sent, or canceled withdrawals.</p>
        <div className="mt-4 space-y-3">
          {withdrawalTransactions.length === 0 ? (
            <p className="text-sm text-slate-500">No withdrawal transactions yet.</p>
          ) : (
            withdrawalTransactions.map((redemption) => (
              <details
                key={redemption.id}
                className="group rounded-xl border border-slate-100 bg-white px-3 py-3 open:border-sky-200 open:bg-sky-50/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{getRedemptionLabel(redemption.method)}</p>
                    <p className="text-xs text-slate-500">
                      {redemption.createdAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatPayoutCurrency(redemption.faceValueCents, redemption.payoutCurrency) ??
                        formatUSD(redemption.amountCents)}{" "}
                      {redemption.payoutCurrency} ({redemption.payoutRegion})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-rose-700">-{formatUSD(redemption.amountCents)}</p>
                    <p className={`text-xs font-semibold ${getStatusClass(redemption.status)}`}>
                      {getStatusLabel(redemption.status)}
                    </p>
                    <p className="text-[11px] font-medium text-sky-700 transition group-open:text-sky-900">
                      Click to view details
                    </p>
                  </div>
                </summary>
                <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-700">
                  {redemption.method === "CUSTOM_WITHDRAWAL" ? (
                    <>
                      <p className="font-semibold text-slate-800">
                        Request: {redemption.customName ?? "Custom item"} ({formatUSD(redemption.amountCents)})
                      </p>
                      {redemption.customDestination ? (
                        <p className="mt-1 text-slate-600">Wallet/Email: {redemption.customDestination}</p>
                      ) : null}
                      {redemption.status === "SENT" ? (
                        <p className="mt-1 font-semibold text-emerald-700">
                          Fulfillment: {redemption.customFulfillment ?? "Approved by admin"}
                        </p>
                      ) : null}
                      {redemption.status === "CANCELED" ? (
                        <p className="mt-1 font-semibold text-rose-700">
                          Declined: {redemption.customDeclineReason ?? "No reason provided."}
                        </p>
                      ) : null}
                    </>
                  ) : redemption.status !== "SENT" ? (
                    <p>
                      This withdrawal is currently <span className="font-semibold">{redemption.status}</span>. CODE will
                      appear here after admin marks it as sent.
                    </p>
                  ) : redemption.note ? (
                    <p className="font-semibold text-emerald-700">CODE: {redemption.note}</p>
                  ) : (
                    <p className="text-slate-600">No code required for this payout method.</p>
                  )}
                  {redemption.processedAt ? (
                    <p className="mt-1 text-slate-500">
                      Processed{" "}
                      {redemption.processedAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </div>
              </details>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

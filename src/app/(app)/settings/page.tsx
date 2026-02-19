import { FlashMessage } from "@/components/flash-message";
import { requireUser } from "@/lib/auth";
import { type PayoutCurrency, getRedemptionLabel } from "@/lib/constants";
import { formatUSD } from "@/lib/money";
import { prisma } from "@/lib/prisma";

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

function formatVerifiedDate(value: Date | null) {
  if (!value) {
    return "Not verified";
  }

  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/settings");
  const params = await searchParams;
  const verified = Boolean(user.emailVerifiedAt);
  const redemptions = await prisma.redemption.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });

  return (
    <div className="space-y-6">
      <section className="page-hero rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
          Account Settings
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Manage your account</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Update your display profile, control chat anonymity, verify email, change password, or permanently delete your
          account.
        </p>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Check Withdrawal Status</h2>
        <p className="mt-1 text-xs text-slate-500">
          Track active and completed withdrawals here. Gift card codes appear once your withdrawal is approved/sent.
        </p>
        <div className="mt-4 space-y-3">
          {redemptions.length === 0 ? (
            <p className="text-sm text-slate-500">No withdrawals yet.</p>
          ) : (
            redemptions.map((redemption) => (
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
                  ) : redemption.note && (redemption.status === "APPROVED" || redemption.status === "SENT") ? (
                    <p className="font-semibold text-emerald-700">CODE: {redemption.note}</p>
                  ) : redemption.status === "APPROVED" ? (
                    <p>
                      Your withdrawal is approved. Code will appear here once delivery is finalized.
                    </p>
                  ) : redemption.status === "SENT" ? (
                    <p className="text-slate-600">No code required for this payout method.</p>
                  ) : redemption.status === "CANCELED" ? (
                    <p className="font-semibold text-rose-700">This withdrawal was canceled and refunded.</p>
                  ) : (
                    <p>
                      This withdrawal is currently <span className="font-semibold">{redemption.status}</span>.
                    </p>
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
        <h2 className="text-lg font-semibold text-slate-900">Profile & Privacy</h2>
        <form action="/api/settings/profile" method="post" className="mt-4 space-y-4">
          <input type="hidden" name="redirectTo" value="/settings" />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Display Name</span>
            <input
              type="text"
              name="name"
              minLength={2}
              maxLength={40}
              defaultValue={user.name}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
            <input type="checkbox" name="anonymousMode" defaultChecked={user.anonymousMode} className="mt-1 h-4 w-4" />
            <span>
              <span className="block text-sm font-medium text-slate-800">Anonymous chat profile</span>
              <span className="block text-xs text-slate-600">
                When enabled, your chat name appears as <strong>Hidden</strong> and your public chat statistics are hidden.
              </span>
            </span>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Save Profile Settings
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Email Verification</h2>
        <p className="mt-2 text-sm text-slate-600">
          Status:{" "}
          <span className={`font-semibold ${verified ? "text-emerald-700" : "text-amber-700"}`}>
            {verified ? `Verified on ${formatVerifiedDate(user.emailVerifiedAt)}` : "Not verified"}
          </span>
        </p>
        {!verified ? (
          <form action="/api/settings/email/send" method="post" className="mt-4">
            <input type="hidden" name="redirectTo" value="/settings" />
            <button
              type="submit"
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300"
            >
              Send Verification Email
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
        <form action="/api/settings/password" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirectTo" value="/settings" />
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-600">Current Password</span>
            <input
              type="password"
              name="currentPassword"
              minLength={6}
              maxLength={64}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">New Password</span>
            <input
              type="password"
              name="newPassword"
              minLength={6}
              maxLength={64}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Confirm New Password</span>
            <input
              type="password"
              name="confirmPassword"
              minLength={6}
              maxLength={64}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 md:col-span-2"
          >
            Update Password
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-rose-800">Delete Account</h2>
        <p className="mt-2 text-sm text-rose-700">
          This cannot be undone. Your account and associated data will be permanently deleted.
        </p>
        <form action="/api/settings/delete-account" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirectTo" value="/settings" />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-rose-700">Current Password</span>
            <input
              type="password"
              name="currentPassword"
              minLength={6}
              maxLength={64}
              required
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-rose-900 outline-none ring-rose-300 transition focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-rose-700">Type DELETE to confirm</span>
            <input
              type="text"
              name="confirmText"
              required
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm uppercase text-rose-900 outline-none ring-rose-300 transition focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 md:col-span-2"
          >
            Permanently Delete Account
          </button>
        </form>
      </section>
    </div>
  );
}

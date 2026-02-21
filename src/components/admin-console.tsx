"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { GIFT_CARD_METHODS } from "@/lib/constants";
import { formatUSD } from "@/lib/money";

type OfferItem = {
  id: string;
  userName: string;
  userEmail: string;
  offerTitle: string | null;
  offerwallName: string;
  offerId: string | null;
  taskKey: string;
  payoutCents: number;
  status: "PENDING" | "PAID";
  pendingUntil: string | null;
  creditedAt: string | null;
  claimedAt: string;
};

type WithdrawalItem = {
  id: string;
  userName: string;
  userEmail: string;
  userLevel: number;
  priorityQueue: boolean;
  method: string;
  methodLabel: string;
  amountCents: number;
  amountLabel: string;
  payoutRegion: "US" | "AUS" | "UK";
  payoutCurrency: "USD" | "AUD" | "GBP";
  faceValueCents: number | null;
  faceValueLabel: string | null;
  status: "PENDING" | "APPROVED" | "SENT" | "CANCELED";
  payoutEmail: string | null;
  discordUsername: string | null;
  deliveryCode: string | null;
  cancelReason: string | null;
  history: boolean;
  createdAt: string;
  processedAt: string | null;
};

type CustomWithdrawalItem = {
  id: string;
  userName: string;
  userEmail: string;
  userLevel: number;
  priorityQueue: boolean;
  amountCents: number;
  amountLabel: string;
  status: "PENDING" | "APPROVED" | "SENT" | "CANCELED";
  customName: string | null;
  customDestination: string | null;
  customDeclineReason: string | null;
  customFulfillment: string | null;
  createdAt: string;
  processedAt: string | null;
};

type ComplaintItem = {
  id: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "MUTED" | "TERMINATED";
  balanceCents: number;
  createdAt: string;
};

type UserLookupMatch = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "MUTED" | "TERMINATED";
  balanceCents: number;
  lifetimeEarnedCents: number;
  totalWithdrawnCents: number;
  level: number;
  createdAt: string;
};

type UserLookupOfferClaim = {
  id: string;
  taskKey: string;
  offerwallName: string;
  offerId: string | null;
  offerTitle: string | null;
  payoutCents: number;
  claimedAt: string;
  pendingUntil: string | null;
  creditedAt: string | null;
  status: "PENDING" | "PAID" | "PROCESSING";
  timeLeft: string | null;
};

type UserLookupTransaction = {
  id: string;
  type:
    | "EARN"
    | "EARN_PENDING"
    | "EARN_RELEASE"
    | "STREAK_CASE"
    | "LEVEL_CASE"
    | "WITHDRAWAL"
    | "WITHDRAWAL_REFUND"
    | "REFERRAL_BONUS"
    | "PROMO_CODE_CREATE"
    | "PROMO_CODE_REDEEM"
    | "WHEEL_SPIN";
  amountCents: number;
  description: string;
  createdAt: string;
};

type UserLookupPayload = {
  matches: UserLookupMatch[];
  user: UserLookupMatch | null;
  offerClaims: UserLookupOfferClaim[];
  transactions: UserLookupTransaction[];
};

type OverviewResponse = {
  metrics: {
    pendingWithdrawals: number;
    pendingCustomWithdrawals: number;
    openComplaints: number;
    mutedUsers: number;
    terminatedUsers: number;
  };
  offers: OfferItem[];
  withdrawals: WithdrawalItem[];
  withdrawalHistory: WithdrawalItem[];
  customWithdrawals: CustomWithdrawalItem[];
  complaints: ComplaintItem[];
  users: UserItem[];
};

function timeAgo(value: string, nowTimestamp: number) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - nowTimestamp) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, unitSeconds] of steps) {
    if (Math.abs(seconds) >= unitSeconds || unit === "second") {
      return formatter.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return "just now";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function postJson(url: string, payload: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Action failed");
  }
}

export function AdminConsole() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [codeByRedemptionId, setCodeByRedemptionId] = useState<Record<string, string>>({});
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});
  const [customReasonById, setCustomReasonById] = useState<Record<string, string>>({});
  const [customFulfillmentById, setCustomFulfillmentById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookup, setLookup] = useState<UserLookupPayload>({
    matches: [],
    user: null,
    offerClaims: [],
    transactions: [],
  });
  const [manualOfferForm, setManualOfferForm] = useState({
    offerwallName: "Easy Earn Manual",
    offerId: "",
    offerTitle: "",
    amount: "4.00",
  });
  const giftCardMethods = new Set(GIFT_CARD_METHODS);

  function requiresCode(method: string) {
    return giftCardMethods.has(method as (typeof GIFT_CARD_METHODS)[number]);
  }

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/overview?ts=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
      });
      if (!response.ok) {
        throw new Error("Unable to load admin data.");
      }
      const payload = (await response.json()) as OverviewResponse;
      setData(payload);
      setNowTimestamp(Date.now());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function searchUsers(query: string, userId?: string) {
    const trimmed = query.trim();
    if (!trimmed && !userId) {
      setLookup({
        matches: [],
        user: null,
        offerClaims: [],
        transactions: [],
      });
      return;
    }

    const params = new URLSearchParams();
    if (trimmed) {
      params.set("query", trimmed);
    }
    if (userId) {
      params.set("userId", userId);
    }

    setLookupLoading(true);
    try {
      const response = await fetch(`/api/admin/user-insights?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Could not run user search.");
      }
      const payload = (await response.json()) as UserLookupPayload;
      setLookup(payload);
      setError(null);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Could not run user search.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await searchUsers(lookupQuery);
  }

  async function handleManualOfferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedUser = lookup.user;
    if (!selectedUser) {
      setError("Select a user first, then create the manual offer.");
      return;
    }

    await runAction(
      "manual-offer-credit",
      () =>
        postJson("/api/admin/offers/manual", {
          userId: selectedUser.id,
          offerwallName: manualOfferForm.offerwallName.trim(),
          offerId: manualOfferForm.offerId.trim(),
          offerTitle: manualOfferForm.offerTitle.trim(),
          amount: manualOfferForm.amount.trim(),
        }),
      async () => {
        await searchUsers(lookupQuery, selectedUser.id);
        setManualOfferForm((current) => ({
          ...current,
          offerId: "",
          offerTitle: "",
        }));
      },
    );
  }

  useEffect(() => {
    void load();
    const refreshInterval = setInterval(() => {
      void load();
    }, 3000);
    const clockInterval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(clockInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [load]);

  async function runAction(key: string, callback: () => Promise<void>, afterSuccess?: () => Promise<void> | void) {
    setBusyKey(key);
    try {
      await callback();
      await load();
      if (afterSuccess) {
        await afterSuccess();
      }
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Admin action failed.");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading admin console...</p>;
  }

  if (!data) {
    return <p className="text-sm text-rose-700">{error || "No admin data found."}</p>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Pending withdrawals</p>
          <p className="text-2xl font-semibold text-slate-900">{data.metrics.pendingWithdrawals}</p>
        </article>
        <article className="rounded-2xl border border-indigo-100 bg-indigo-50/55 p-4 shadow-sm">
          <p className="text-xs text-indigo-700">Pending custom requests</p>
          <p className="text-2xl font-semibold text-indigo-900">{data.metrics.pendingCustomWithdrawals}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Open complaints</p>
          <p className="text-2xl font-semibold text-slate-900">{data.metrics.openComplaints}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Muted users</p>
          <p className="text-2xl font-semibold text-slate-900">{data.metrics.mutedUsers}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Terminated users</p>
          <p className="text-2xl font-semibold text-slate-900">{data.metrics.terminatedUsers}</p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">User Search and Offer History</h2>
          <p className="text-xs text-slate-500">Search by username, email, or referral code.</p>
        </div>
        <form onSubmit={handleLookupSubmit} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[260px] flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Search user</span>
            <input
              type="text"
              value={lookupQuery}
              onChange={(event) => setLookupQuery(event.target.value)}
              placeholder="e.g. username or admin@example.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={lookupLoading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {lookupLoading ? "Searching..." : "Search"}
          </button>
        </form>

        {lookup.matches.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {lookup.matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => {
                  setLookupQuery(match.name);
                  searchUsers(match.name, match.id);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  lookup.user?.id === match.id
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                title={`User ID: ${match.id}`}
              >
                {match.name} ({match.email}) - {match.id}
              </button>
            ))}
          </div>
        ) : null}

        {lookup.user ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {lookup.user.name} ({lookup.user.email})
              </p>
              <p className="text-xs text-slate-600">User ID: {lookup.user.id}</p>
              <p className="text-xs text-slate-600">
                Level {lookup.user.level} - Role: {lookup.user.role} - Status: {lookup.user.status} - Referral code:{" "}
                {lookup.user.referralCode}
              </p>
              <p className="text-xs text-slate-600">
                Balance {formatUSD(lookup.user.balanceCents)} - Lifetime {formatUSD(lookup.user.lifetimeEarnedCents)} -
                Withdrawn {formatUSD(lookup.user.totalWithdrawnCents)}
              </p>
            </div>

            <article className="rounded-2xl border border-sky-100 bg-sky-50/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Manual Offer Credit (Admin)</h3>
                <p className="text-[11px] text-sky-700">
                  Pending rules: $3.01-$7.00 = 14d, above $7.00 = 30d
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Create a fake offer for <span className="font-semibold">{lookup.user.name}</span> using the same payout
                flow as real offers, including pending behavior and delayed level contribution.
              </p>
              <form onSubmit={handleManualOfferSubmit} className="mt-3 grid gap-2 md:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Offerwall name</span>
                  <input
                    type="text"
                    required
                    value={manualOfferForm.offerwallName}
                    onChange={(event) =>
                      setManualOfferForm((current) => ({
                        ...current,
                        offerwallName: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Offer ID (optional)</span>
                  <input
                    type="text"
                    value={manualOfferForm.offerId}
                    onChange={(event) =>
                      setManualOfferForm((current) => ({
                        ...current,
                        offerId: event.target.value,
                      }))
                    }
                    placeholder="AUTO if empty"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Offer title</span>
                  <input
                    type="text"
                    required
                    value={manualOfferForm.offerTitle}
                    onChange={(event) =>
                      setManualOfferForm((current) => ({
                        ...current,
                        offerTitle: event.target.value,
                      }))
                    }
                    placeholder="Example: CPX high payout survey"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Amount in USD</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={manualOfferForm.amount}
                    onChange={(event) =>
                      setManualOfferForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                  />
                </label>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={busyKey === "manual-offer-credit"}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    {busyKey === "manual-offer-credit" ? "Creating..." : "Create Manual Offer Credit"}
                  </button>
                </div>
              </form>
            </article>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Offer Claims</h3>
                <p className="text-xs text-slate-500">
                  Offerwall name, offer ID, payout, completion time, paid time, and pending status.
                </p>
                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {lookup.offerClaims.length === 0 ? (
                    <p className="text-xs text-slate-500">No offer claims for this user.</p>
                  ) : (
                    lookup.offerClaims.map((claim) => (
                      <div key={claim.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900">{claim.offerTitle ?? claim.taskKey}</p>
                          <p className="text-xs font-semibold text-slate-800">{formatUSD(claim.payoutCents)}</p>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {claim.offerwallName} - ID: {claim.offerId ?? "N/A"}
                        </p>
                        <p className="text-[11px] text-slate-500">Completed: {formatDateTime(claim.claimedAt)}</p>
                        <p className="text-[11px] text-slate-500">
                          Paid: {claim.creditedAt ? formatDateTime(claim.creditedAt) : "Not paid yet"}
                        </p>
                        <p
                          className={`text-[11px] font-semibold ${
                            claim.status === "PENDING"
                              ? "text-amber-700"
                              : claim.status === "PAID"
                                ? "text-emerald-700"
                                : "text-slate-600"
                          }`}
                        >
                          {claim.status}
                          {claim.timeLeft ? ` - ${claim.timeLeft}` : ""}
                        </p>
                        {claim.status === "PENDING" && lookup.user ? (
                          <button
                            type="button"
                            disabled={busyKey === `release-claim-${claim.id}`}
                            onClick={() =>
                              runAction(
                                `release-claim-${claim.id}`,
                                () =>
                                  postJson("/api/admin/offer-claims", {
                                    action: "release",
                                    claimId: claim.id,
                                  }),
                                () => searchUsers(lookupQuery, lookup.user?.id),
                              )
                            }
                            className="mt-2 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                          >
                            Release Early
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Transactions</h3>
                <p className="text-xs text-slate-500">Complete wallet transaction history for this user.</p>
                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {lookup.transactions.length === 0 ? (
                    <p className="text-xs text-slate-500">No transactions found.</p>
                  ) : (
                    lookup.transactions.map((entry) => {
                      const positive = entry.amountCents >= 0;
                      const pending = entry.type === "EARN_PENDING";
                      return (
                        <div key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-900">{entry.type}</p>
                            <p
                              className={`text-xs font-semibold ${
                                pending ? "text-amber-700" : positive ? "text-sky-700" : "text-rose-700"
                              }`}
                            >
                              {positive ? "+" : "-"}
                              {formatUSD(Math.abs(entry.amountCents))}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-600">{entry.description}</p>
                          <p className="text-[11px] text-slate-500">{formatDateTime(entry.createdAt)}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            </div>
          </div>
        ) : lookupQuery.trim() ? (
          <p className="mt-4 text-sm text-slate-500">No matching user details loaded yet.</p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Custom Withdrawal Requests</h2>
        <p className="mt-1 text-xs text-slate-600">
          Custom requests are reviewed separately. Approve with fulfillment details or decline with a reason.
        </p>
        <div className="mt-4 space-y-3">
          {data.customWithdrawals.length === 0 ? (
            <p className="text-sm text-slate-500">No custom withdrawal requests yet.</p>
          ) : (
            data.customWithdrawals.map((item) => (
              <div key={item.id} className="rounded-xl border border-indigo-100 bg-white/90 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">
                    {item.userName} ({item.userEmail})
                  </p>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    Lv {item.userLevel}
                  </span>
                  {item.priorityQueue ? (
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      VIP+ PRIORITY
                    </span>
                  ) : null}
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Request: {item.customName ?? "Custom withdrawal"} ({item.amountLabel})
                </p>
                {item.customDestination ? (
                  <p className="text-xs text-slate-600">Wallet/Email: {item.customDestination}</p>
                ) : null}
                <p className="text-xs font-semibold text-slate-600">Status: {item.status}</p>
                <p className="text-xs text-slate-500">{timeAgo(item.createdAt, nowTimestamp)}</p>
                {item.status === "SENT" ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Fulfillment: {item.customFulfillment ?? "Approved by admin"}
                  </p>
                ) : null}
                {item.status === "CANCELED" ? (
                  <p className="mt-1 text-xs font-semibold text-rose-700">
                    Decline reason: {item.customDeclineReason ?? "No reason provided."}
                  </p>
                ) : null}

                {item.status === "PENDING" ? (
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Fulfillment details (for approve)</span>
                      <input
                        type="text"
                        value={customFulfillmentById[item.id] ?? ""}
                        onChange={(event) =>
                          setCustomFulfillmentById((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="What you provided to user"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Decline reason</span>
                      <input
                        type="text"
                        value={customReasonById[item.id] ?? ""}
                        onChange={(event) =>
                          setCustomReasonById((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="Reason for declining request"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 md:col-span-2">
                      <button
                        type="button"
                        disabled={busyKey === `custom-approve-${item.id}` || !(customFulfillmentById[item.id] ?? "").trim()}
                        onClick={() =>
                          runAction(`custom-approve-${item.id}`, () =>
                            postJson("/api/admin/withdrawals/custom", {
                              action: "approve",
                              redemptionId: item.id,
                              fulfillment: (customFulfillmentById[item.id] ?? "").trim(),
                            }),
                          )
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Accept + Provide
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `custom-decline-${item.id}` || !(customReasonById[item.id] ?? "").trim()}
                        onClick={() =>
                          runAction(`custom-decline-${item.id}`, () =>
                            postJson("/api/admin/withdrawals/custom", {
                              action: "decline",
                              redemptionId: item.id,
                              reason: (customReasonById[item.id] ?? "").trim(),
                            }),
                          )
                        }
                        className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Decline + Reason
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Withdrawal History</h2>
        <div className="mt-4 space-y-3">
          {data.withdrawalHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No processed withdrawals yet.</p>
          ) : (
            data.withdrawalHistory.map((item) => {
              const payoutDestination =
                item.method === "PAYPAL"
                  ? item.payoutEmail
                  : item.method === "DISCORD_NITRO"
                    ? item.discordUsername
                    : null;
              const payoutDestinationLabel =
                item.method === "PAYPAL"
                  ? "PayPal email"
                  : item.method === "DISCORD_NITRO"
                    ? "Discord username"
                    : null;
              return (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {item.userName} ({item.userEmail})
                    </p>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                      Lv {item.userLevel}
                    </span>
                    {item.priorityQueue ? (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        VIP+ PRIORITY
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-600">
                    {item.methodLabel} - {item.faceValueLabel ? `${item.faceValueLabel} ${item.payoutCurrency}` : item.amountLabel} (
                    {item.amountLabel} charged)
                  </p>
                  {payoutDestinationLabel ? (
                    <p className="text-xs text-slate-700">
                      {payoutDestinationLabel}: <span className="font-semibold">{payoutDestination ?? "Not provided"}</span>
                    </p>
                  ) : null}
                  <p className="text-xs font-semibold text-slate-600">Status: {item.status}</p>
                  {item.status === "SENT" ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      {item.deliveryCode ? `CODE: ${item.deliveryCode}` : "Code not required (PayPal or wallet transfer)."}
                    </p>
                  ) : null}
                  {item.status === "CANCELED" ? (
                    <p className="mt-1 text-xs font-semibold text-rose-700">
                      Cancel reason: {item.cancelReason ?? "No reason provided."}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    {item.processedAt
                      ? `Processed ${timeAgo(item.processedAt, nowTimestamp)}`
                      : `Requested ${timeAgo(item.createdAt, nowTimestamp)}`}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Offers Completed (Live)</h2>
          <div className="mt-4 space-y-3">
            {data.offers.length === 0 ? (
              <p className="text-sm text-slate-500">No completed offers yet.</p>
            ) : (
              data.offers.map((offer) => (
                <div key={offer.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <p className="text-sm font-medium text-slate-800">
                    {offer.userName} ({offer.userEmail})
                  </p>
                  <p className="text-xs text-slate-600">
                    {offer.offerTitle ?? offer.taskKey} - {offer.offerwallName} - ID: {offer.offerId ?? "N/A"} - +
                    {formatUSD(offer.payoutCents)}
                  </p>
                  <p className="text-xs text-slate-500">Completed {timeAgo(offer.claimedAt, nowTimestamp)}</p>
                  <p className={`text-xs font-semibold ${offer.status === "PENDING" ? "text-amber-700" : "text-emerald-700"}`}>
                    {offer.status}
                    {offer.status === "PENDING" && offer.pendingUntil
                      ? ` - releases ${new Date(offer.pendingUntil).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Withdrawal Queue (Live)</h2>
          <div className="mt-4 space-y-3">
            {data.withdrawals.length === 0 ? (
              <p className="text-sm text-slate-500">No active withdrawal requests.</p>
            ) : (
              data.withdrawals.map((item) => {
                const payoutDestination =
                  item.method === "PAYPAL"
                    ? item.payoutEmail
                    : item.method === "DISCORD_NITRO"
                      ? item.discordUsername
                      : null;
                const payoutDestinationLabel =
                  item.method === "PAYPAL"
                    ? "PayPal email"
                    : item.method === "DISCORD_NITRO"
                      ? "Discord username"
                      : null;
                return (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {item.userName} ({item.userEmail})
                    </p>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                      Lv {item.userLevel}
                    </span>
                    {item.priorityQueue ? (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        VIP+ PRIORITY
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-600">
                    {item.methodLabel} -{" "}
                    {item.faceValueLabel ? `${item.faceValueLabel} ${item.payoutCurrency}` : item.amountLabel}{" "}
                    ({item.amountLabel} charged)
                  </p>
                  {payoutDestinationLabel ? (
                    <p className="text-xs text-slate-700">
                      {payoutDestinationLabel}:{" "}
                      <span className="font-semibold">{payoutDestination ?? "Not provided"}</span>
                    </p>
                  ) : null}
                  <p className="text-xs font-semibold text-slate-600">Status: {item.status}</p>
                  <p className="text-xs text-slate-500">{timeAgo(item.createdAt, nowTimestamp)}</p>

                  <label className="mt-2 flex w-full flex-col gap-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Cancel reason</span>
                    <input
                      type="text"
                      value={cancelReasonById[item.id] ?? ""}
                      onChange={(event) =>
                        setCancelReasonById((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Reason for canceling and refunding this withdrawal"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                    />
                  </label>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.status === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          disabled={busyKey === `approve-${item.id}`}
                          onClick={() =>
                            runAction(`approve-${item.id}`, () =>
                              postJson("/api/admin/withdrawals", { action: "approve", redemptionId: item.id }),
                            )
                          }
                          className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyKey === `cancel-${item.id}` || !(cancelReasonById[item.id] ?? "").trim()}
                          onClick={() =>
                            runAction(`cancel-${item.id}`, () =>
                              postJson("/api/admin/withdrawals", {
                                action: "cancel",
                                redemptionId: item.id,
                                reason: (cancelReasonById[item.id] ?? "").trim(),
                              }),
                            )
                          }
                          className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : null}

                    {item.status === "APPROVED" ? (
                      <>
                        {requiresCode(item.method) ? (
                          <label className="flex w-full flex-col gap-1 text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">CODE</span>
                            <input
                              type="text"
                              value={codeByRedemptionId[item.id] ?? item.deliveryCode ?? ""}
                              onChange={(event) =>
                                setCodeByRedemptionId((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              placeholder="Enter gift card code"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                            />
                          </label>
                        ) : null}
                        <button
                          type="button"
                          disabled={
                            busyKey === `send-${item.id}` ||
                            (requiresCode(item.method) &&
                              !(codeByRedemptionId[item.id] ?? item.deliveryCode ?? "").trim())
                          }
                          onClick={() =>
                            runAction(`send-${item.id}`, () =>
                              postJson("/api/admin/withdrawals", {
                                action: "send",
                                redemptionId: item.id,
                                code: (codeByRedemptionId[item.id] ?? item.deliveryCode ?? "").trim(),
                              }),
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Mark Sent
                        </button>
                        <button
                          type="button"
                          disabled={busyKey === `cancel-${item.id}` || !(cancelReasonById[item.id] ?? "").trim()}
                          onClick={() =>
                            runAction(`cancel-${item.id}`, () =>
                              postJson("/api/admin/withdrawals", {
                                action: "cancel",
                                redemptionId: item.id,
                                reason: (cancelReasonById[item.id] ?? "").trim(),
                              }),
                            )
                          }
                          className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Complaints</h2>
          <div className="mt-4 space-y-3">
            {data.complaints.length === 0 ? (
              <p className="text-sm text-slate-500">No complaints submitted.</p>
            ) : (
              data.complaints.map((complaint) => (
                <div key={complaint.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <p className="text-sm font-medium text-slate-800">
                    {complaint.userName} ({complaint.userEmail})
                  </p>
                  <p className="text-xs font-semibold text-slate-700">{complaint.subject}</p>
                  <p className="text-xs text-slate-600">{complaint.message}</p>
                  <p className="text-xs text-slate-500">
                    {complaint.status} - {timeAgo(complaint.createdAt, nowTimestamp)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyKey === `complaint-primary-${complaint.id}`}
                      onClick={() =>
                        runAction(`complaint-primary-${complaint.id}`, () =>
                          postJson("/api/admin/complaints", {
                            complaintId: complaint.id,
                            action: complaint.status === "OPEN" ? "resolve" : "reopen",
                          }),
                        )
                      }
                      className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {complaint.status === "OPEN" ? "Resolve" : "Reopen"}
                    </button>
                    {complaint.status !== "DISMISSED" ? (
                      <button
                        type="button"
                        disabled={busyKey === `complaint-dismiss-${complaint.id}`}
                        onClick={() =>
                          runAction(`complaint-dismiss-${complaint.id}`, () =>
                            postJson("/api/admin/complaints", {
                              complaintId: complaint.id,
                              action: "dismiss",
                            }),
                          )
                        }
                        className="rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">User Moderation</h2>
          <div className="mt-4 space-y-3">
            {data.users.length === 0 ? (
              <p className="text-sm text-slate-500">No users found.</p>
            ) : (
              data.users.map((user) => (
                <div key={user.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <p className="text-sm font-medium text-slate-800">
                    {user.name} ({user.email})
                  </p>
                  <p className="text-xs text-slate-600">
                    Role: {user.role} - Status: {user.status} - Balance: {formatUSD(user.balanceCents)}
                  </p>
                  {user.role === "ADMIN" ? (
                    <p className="mt-2 text-xs font-medium text-slate-500">Admin account</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyKey === `active-${user.id}`}
                        onClick={() =>
                          runAction(`active-${user.id}`, () =>
                            postJson("/api/admin/users/status", { userId: user.id, status: "ACTIVE" }),
                          )
                        }
                        className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Activate
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `mute-${user.id}`}
                        onClick={() =>
                          runAction(`mute-${user.id}`, () =>
                            postJson("/api/admin/users/status", { userId: user.id, status: "MUTED" }),
                          )
                        }
                        className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Mute
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `terminate-${user.id}`}
                        onClick={() =>
                          runAction(`terminate-${user.id}`, () =>
                            postJson("/api/admin/users/status", { userId: user.id, status: "TERMINATED" }),
                          )
                        }
                        className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Terminate
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

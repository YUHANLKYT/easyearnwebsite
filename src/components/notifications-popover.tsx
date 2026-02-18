"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";

import { formatUSD } from "@/lib/money";

type PendingClaimItem = {
  id: string;
  offerName: string;
  offerwallName: string;
  offerId: string | null;
  payoutCents: number;
  pendingUntil: string | null;
  claimedAt: string;
  timeLeft: string;
};

type TransactionItem = {
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

type NotificationsPayload = {
  pendingTotalCents: number;
  pendingClaims: PendingClaimItem[];
  transactions: TransactionItem[];
};

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<NotificationsPayload | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current) {
        return;
      }
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (!open) {
      return undefined;
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load notifications.");
        }
        const data = (await response.json()) as NotificationsPayload;
        if (!active) {
          return;
        }
        setPayload(data);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Could not load notifications.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(load, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [open]);

  const pendingCount = payload?.pendingClaims.length ?? 0;

  const transactionRows = useMemo(() => payload?.transactions ?? [], [payload?.transactions]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="ui-btn ui-btn-soft relative rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
      >
        <span className="inline-flex items-center gap-2">
          <FiBell className="h-4 w-4" />
          Notifications
        </span>
        {pendingCount > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="ui-popover absolute right-0 z-40 mt-2 w-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="ui-popover-head border-b border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <p className="text-xs text-slate-600">
              Pending: <span className="font-semibold text-amber-700">{formatUSD(payload?.pendingTotalCents ?? 0)}</span>
            </p>
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
            <article className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Pending Offer Credits</p>
              <p className="mt-1 text-xs text-amber-800">
                If you have proof of completion, contact support and your pending credit may be released earlier.
              </p>
              <div className="mt-2 space-y-2">
                {loading && !payload ? (
                  <p className="text-xs text-amber-700">Loading pending offers...</p>
                ) : pendingCount < 1 ? (
                  <p className="text-xs text-amber-700">No pending offers right now.</p>
                ) : (
                  payload?.pendingClaims.map((claim) => (
                    <div key={claim.id} className="rounded-lg border border-amber-200 bg-white px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900">{claim.offerName}</p>
                        <p className="text-xs font-semibold text-amber-800">{formatUSD(claim.payoutCents)}</p>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {claim.offerwallName} - {claim.offerId ?? "No offer ID"}
                      </p>
                      <p className="text-[11px] font-semibold text-amber-700">{claim.timeLeft}</p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">All Transactions</p>
              {loading && !payload ? <p className="text-xs text-slate-500">Loading transactions...</p> : null}
              {error ? <p className="text-xs text-rose-700">{error}</p> : null}
              <div className="space-y-2">
                {transactionRows.length < 1 && !loading ? (
                  <p className="text-xs text-slate-500">No transactions yet.</p>
                ) : (
                  transactionRows.map((entry) => {
                    const positive = entry.amountCents >= 0;
                    const pending = entry.type === "EARN_PENDING";
                    return (
                      <div key={entry.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-slate-800">
                            {entry.description}
                            {pending ? (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                Pending
                              </span>
                            ) : null}
                          </p>
                          <p
                            className={`text-xs font-semibold ${
                              pending ? "text-amber-700" : positive ? "text-sky-700" : "text-rose-700"
                            }`}
                          >
                            {positive ? "+" : "-"}
                            {formatUSD(Math.abs(entry.amountCents))}
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">{formatWhen(entry.createdAt)}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </div>
  );
}

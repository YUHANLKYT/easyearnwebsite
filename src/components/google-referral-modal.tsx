"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SIGNUP_BONUS_CENTS } from "@/lib/constants";
import { formatUSD } from "@/lib/money";

type GoogleReferralModalProps = {
  initialReferralCode?: string;
};

function normalizeReferralCode(value: string) {
  return value.trim().toUpperCase().slice(0, 32);
}

export function GoogleReferralModal({ initialReferralCode = "EASY" }: GoogleReferralModalProps) {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState(normalizeReferralCode(initialReferralCode) || "EASY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimLabel = useMemo(() => {
    const normalized = normalizeReferralCode(referralCode) || "EASY";
    return `Claim ${formatUSD(SIGNUP_BONUS_CENTS)} with ${normalized}`;
  }, [referralCode]);

  async function handleClaim() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/referral/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referralCode: normalizeReferralCode(referralCode) || "EASY",
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || "Could not claim referral bonus.");
        return;
      }

      router.replace("/dashboard?signupBonus=1");
      router.refresh();
    } catch {
      setError("Could not claim referral bonus.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
        <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
          Referral Bonus
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Do you have a referral code?</h2>
        <p className="mt-2 text-sm text-slate-600">
          If not, use <span className="font-semibold text-slate-900">EASY</span> for {formatUSD(SIGNUP_BONUS_CENTS)} free.
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Referral code</span>
          <input
            type="text"
            value={referralCode}
            onChange={(event) => setReferralCode(event.currentTarget.value.toUpperCase())}
            maxLength={32}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            placeholder="EASY"
          />
        </label>

        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleClaim}
            disabled={submitting}
            className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Claiming..." : claimLabel}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

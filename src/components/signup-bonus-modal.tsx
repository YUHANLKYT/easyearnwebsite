"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SIGNUP_BONUS_CENTS } from "@/lib/constants";
import { formatUSD } from "@/lib/money";

export function SignupBonusModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function runConfetti() {
      const confettiLib = await import("canvas-confetti");
      const confetti = confettiLib.default;
      if (!mounted) {
        return;
      }

      const durationMs = 1800;
      const endTime = Date.now() + durationMs;

      function shoot() {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.64, x: 0.3 },
          scalar: 0.9,
        });
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.64, x: 0.7 },
          scalar: 0.9,
        });
      }

      shoot();
      const interval = setInterval(() => {
        shoot();
        if (Date.now() > endTime) {
          clearInterval(interval);
        }
      }, 360);
    }

    runConfetti().catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
        <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
          Welcome Bonus
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">You got {formatUSD(SIGNUP_BONUS_CENTS)} free</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your sign-up bonus was added instantly to your wallet. Start earning now.
        </p>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            router.push("/earn");
          }}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Let&apos;s Earn!
        </button>
      </div>
    </div>
  );
}

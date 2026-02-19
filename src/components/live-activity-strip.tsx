"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/money";

type ActivityItem = {
  id: string;
  userName: string;
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

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds || unit === "second") {
      return formatter.format(Math.round(seconds / unitSeconds), unit);
    }
  }

  return "just now";
}

export function LiveActivityStrip() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/live-activity", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { items: ActivityItem[] };
        if (active) {
          setItems(payload.items.slice(0, 14));
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(load, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const content = useMemo(() => {
    if (loading && items.length === 0) {
      return <p className="text-xs text-slate-500">Loading live activity...</p>;
    }

    if (!loading && items.length === 0) {
      return <p className="text-xs text-slate-500">No live activity yet.</p>;
    }

    return (
      <div className="overflow-hidden">
        <div className="flex min-w-max items-center gap-2">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const positive = item.amountCents >= 0;
              const pending = item.type === "EARN_PENDING";
              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -34, scaleX: 0.45 }}
                  animate={{ opacity: 1, x: 0, scaleX: 1 }}
                  exit={{ opacity: 0, x: 34, scaleX: 0.45 }}
                  transition={{ duration: 0.28 }}
                  style={{ transformOrigin: "left center" }}
                  className="live-strip-item rounded-xl border border-slate-100 bg-white/95 px-3 py-2 shadow-sm"
                >
                  <p className="text-xs font-medium text-slate-700">
                    {item.userName} - {item.description}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatRelativeTime(item.createdAt)}</p>
                  <p className={`text-xs font-semibold ${pending ? "text-amber-700" : positive ? "text-sky-700" : "text-rose-700"}`}>
                    {positive ? "+" : "-"}
                    {formatUSD(Math.abs(item.amountCents))}
                  </p>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }, [items, loading]);

  return (
    <section className="live-strip-shell rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Live Activity</h2>
        <span className="rounded-full border border-sky-200/80 bg-sky-100/90 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
          Realtime
        </span>
      </div>
      {content}
    </section>
  );
}

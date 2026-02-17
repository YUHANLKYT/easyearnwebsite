"use client";

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
    ["day", 86_400],
    ["hour", 3_600],
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

export function LiveActivity() {
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
          setItems(payload.items);
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-slate-500">Loading activity feed...</p>;
    }

    if (items.length === 0) {
      return <p className="text-sm text-slate-500">No recent activity yet.</p>;
    }

    return (
      <ul className="space-y-3">
        {items.map((item) => {
          const positive = item.amountCents >= 0;
          const pending = item.type === "EARN_PENDING";
          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {item.userName} - {item.description}
                </p>
                <p className="text-xs text-slate-500">{formatRelativeTime(item.createdAt)}</p>
              </div>
              <p className={`text-sm font-semibold ${pending ? "text-amber-700" : positive ? "text-sky-700" : "text-rose-700"}`}>
                {positive ? "+" : "-"}
                {formatUSD(Math.abs(item.amountCents))}
              </p>
            </li>
          );
        })}
      </ul>
    );
  }, [items, loading]);

  return (
    <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Live Activity</h2>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
          Updates every 8s
        </span>
      </div>
      {content}
    </section>
  );
}

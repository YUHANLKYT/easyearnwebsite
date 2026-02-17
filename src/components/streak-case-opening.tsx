"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  STREAK_CASE_14_SEGMENTS,
  STREAK_CASE_7_SEGMENTS,
  STREAK_DAILY_TARGET_CENTS,
  type StreakCaseSegment,
  type StreakCaseTier,
} from "@/lib/constants";
import { formatUSD } from "@/lib/money";

type RewardPayload = {
  id: string;
  label: string;
  amountCents: number;
  colorClass: string;
};

type StreakCaseOpeningProps = {
  streakDays: number;
  todayEarnedCents: number;
  remainingTodayCents: number;
  todayQualified: boolean;
  canKeepToday: boolean;
  availableCase7: boolean;
  availableCase14: boolean;
  claimedCase7: boolean;
  claimedCase14: boolean;
  nextMilestone: 7 | 14 | null;
  daysToNextMilestone: number | null;
  canUseCase: boolean;
};

type ReelEntry = {
  id: string;
  label: string;
  colorClass: string;
};

type StreakStatePayload = {
  streakDays: number;
  todayEarnedCents: number;
  remainingTodayCents: number;
  todayQualified: boolean;
  canKeepToday: boolean;
  availableCase7: boolean;
  availableCase14: boolean;
  claimedCase7: boolean;
  claimedCase14: boolean;
  nextMilestone: 7 | 14 | null;
  daysToNextMilestone: number | null;
};

const CARD_WIDTH = 126;
const CARD_GAP = 10;
const REEL_COUNT = 68;
const WIN_INDEX = 52;

function getSegmentsByTier(tier: StreakCaseTier): StreakCaseSegment[] {
  return tier === 14 ? STREAK_CASE_14_SEGMENTS : STREAK_CASE_7_SEGMENTS;
}

function randomSegmentByOdds(tier: StreakCaseTier): ReelEntry {
  const segments = getSegmentsByTier(tier);
  const totalWeight = segments.reduce((sum, item) => sum + item.chancePermille, 0);
  let roll = Math.random() * totalWeight;

  for (const segment of segments) {
    roll -= segment.chancePermille;
    if (roll <= 0) {
      return { id: segment.id, label: segment.label, colorClass: segment.colorClass };
    }
  }

  const fallback = segments[0];
  return { id: fallback.id, label: fallback.label, colorClass: fallback.colorClass };
}

function buildReel(tier: StreakCaseTier, winningId?: string): ReelEntry[] {
  const entries = Array.from({ length: REEL_COUNT }, () => randomSegmentByOdds(tier));
  if (winningId) {
    const winner = getSegmentsByTier(tier).find((segment) => segment.id === winningId);
    if (winner) {
      entries[WIN_INDEX] = { id: winner.id, label: winner.label, colorClass: winner.colorClass };
    }
  }
  return entries;
}

function describeTierRewards(tier: StreakCaseTier): string {
  return tier === 14 ? "$0.50, $1.00, $2.50, $5.00" : "$0.25, $0.50, $1.00, $2.50";
}

export function StreakCaseOpening({
  streakDays,
  todayEarnedCents,
  remainingTodayCents,
  todayQualified,
  canKeepToday,
  availableCase7,
  availableCase14,
  claimedCase7,
  claimedCase14,
  nextMilestone,
  daysToNextMilestone,
  canUseCase,
}: StreakCaseOpeningProps) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [state, setState] = useState<StreakStatePayload>({
    streakDays,
    todayEarnedCents,
    remainingTodayCents,
    todayQualified,
    canKeepToday,
    availableCase7,
    availableCase14,
    claimedCase7,
    claimedCase14,
    nextMilestone,
    daysToNextMilestone,
  });
  const [activeTier, setActiveTier] = useState<StreakCaseTier>(7);
  const [trackItems, setTrackItems] = useState<ReelEntry[]>(() => buildReel(7));
  const [trackX, setTrackX] = useState(0);
  const [trackTransition, setTrackTransition] = useState("none");
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winReward, setWinReward] = useState<RewardPayload | null>(null);

  const canOpen7 = canUseCase && state.availableCase7 && !spinning;
  const canOpen14 = canUseCase && state.availableCase14 && !spinning;
  const nextMilestoneText = useMemo(() => {
    if (!state.nextMilestone || state.daysToNextMilestone === null) {
      return "All streak case milestones unlocked.";
    }
    if (state.daysToNextMilestone <= 0) {
      return `${state.nextMilestone}-day streak case unlocked.`;
    }
    return `${state.daysToNextMilestone} day${state.daysToNextMilestone === 1 ? "" : "s"} to the next streak case.`;
  }, [state.daysToNextMilestone, state.nextMilestone]);

  async function openTierCase(tier: StreakCaseTier) {
    if (spinning) {
      return;
    }

    if ((tier === 7 && !state.availableCase7) || (tier === 14 && !state.availableCase14) || !canUseCase) {
      return;
    }

    setError(null);
    setWinReward(null);
    setSpinning(true);

    try {
      const response = await fetch("/api/streak/case/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier }),
      });

      const payload = (await response.json()) as {
        error?: string;
        reward?: RewardPayload;
        streak?: StreakStatePayload;
      };

      if (!response.ok || !payload.reward || !payload.streak) {
        throw new Error(payload.error || "Could not open streak case.");
      }

      setActiveTier(tier);
      const items = buildReel(tier, payload.reward.id);
      setTrackItems(items);
      setTrackTransition("none");
      setTrackX(0);

      const viewportWidth = viewportRef.current?.clientWidth ?? 640;
      const centerOffset = viewportWidth / 2 - CARD_WIDTH / 2;
      const targetX = -(WIN_INDEX * (CARD_WIDTH + CARD_GAP) - centerOffset);

      requestAnimationFrame(() => {
        setTrackTransition("transform 5.2s cubic-bezier(0.07, 0.64, 0.2, 1)");
        setTrackX(targetX);
      });

      window.setTimeout(() => {
        setWinReward(payload.reward ?? null);
        setState(payload.streak ?? state);
        setSpinning(false);
        router.refresh();
      }, 5400);
    } catch (openError) {
      setSpinning(false);
      setError(openError instanceof Error ? openError.message : "Could not open streak case.");
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-fuchsia-100 bg-gradient-to-br from-white via-fuchsia-50/45 to-sky-50 p-5 shadow-[0_16px_38px_rgba(124,58,237,0.10)]">
      <div className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-fuchsia-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Streak Bonus Cases</h2>
          <p className="text-sm text-slate-600">
            Earn at least {formatUSD(STREAK_DAILY_TARGET_CENTS)} from offers each day to keep your streak alive.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs text-slate-600">
          Streak days: <span className="font-semibold text-slate-900">{state.streakDays}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs text-slate-600">
          Today: <span className="font-semibold text-slate-900">{formatUSD(state.todayEarnedCents)}</span> /{" "}
          {formatUSD(STREAK_DAILY_TARGET_CENTS)}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs text-slate-600">
          Remaining today: <span className="font-semibold text-slate-900">{formatUSD(state.remainingTodayCents)}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs text-slate-600">
          Next milestone: <span className="font-semibold text-slate-900">{nextMilestoneText}</span>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {state.todayQualified
          ? "Today's streak target is completed."
          : state.canKeepToday
            ? `Earn ${formatUSD(state.remainingTodayCents)} more today to keep your streak.`
            : `Earn ${formatUSD(state.remainingTodayCents)} today to start a new streak.`}
      </div>

      {!canUseCase ? (
        <p className="mb-3 text-xs font-medium text-amber-700">Your account must be active to open streak cases.</p>
      ) : null}
      {error ? <p className="mb-3 text-xs font-medium text-rose-700">{error}</p> : null}

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-white/85 p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">7-Day Streak Case</p>
          <p className="mt-1 text-xs text-slate-600">Rewards: {describeTierRewards(7)}</p>
          <p className="mt-1 text-xs font-medium text-slate-700">
            Status:{" "}
            {state.availableCase7
              ? "Ready to open"
              : state.claimedCase7
                ? "Opened for current streak"
                : "Unlocks at 7 streak days"}
          </p>
          <button
            type="button"
            onClick={() => openTierCase(7)}
            disabled={!canOpen7}
            className="mt-3 rounded-xl bg-gradient-to-r from-fuchsia-400 to-sky-500 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {spinning && activeTier === 7 ? "Opening..." : "Open 7-Day Case"}
          </button>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white/85 p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">14-Day Streak Case</p>
          <p className="mt-1 text-xs text-slate-600">Rewards: {describeTierRewards(14)}</p>
          <p className="mt-1 text-xs font-medium text-slate-700">
            Status:{" "}
            {state.availableCase14
              ? "Ready to open"
              : state.claimedCase14
                ? "Opened for current streak"
                : "Unlocks at 14 streak days"}
          </p>
          <button
            type="button"
            onClick={() => openTierCase(14)}
            disabled={!canOpen14}
            className="mt-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {spinning && activeTier === 14 ? "Opening..." : "Open 14-Day Case"}
          </button>
        </article>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-cyan-50 via-white to-fuchsia-50 px-3 py-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-cyan-50 via-cyan-50/85 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-fuchsia-50 via-fuchsia-50/85 to-transparent" />
        <div className="pointer-events-none absolute top-0 left-1/2 h-full w-[3px] -translate-x-1/2 bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.8)]" />

        <div ref={viewportRef} className="overflow-hidden">
          <div
            className="flex"
            style={{
              gap: `${CARD_GAP}px`,
              transform: `translateX(${trackX}px)`,
              transition: trackTransition,
              willChange: "transform",
            }}
          >
            {trackItems.map((item, index) => (
              <div
                key={`${activeTier}-${item.id}-${index}`}
                className={`flex h-[74px] w-[126px] shrink-0 items-center justify-center rounded-xl border border-white/90 px-3 text-sm font-bold tracking-wide shadow-md ${item.colorClass}`}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {winReward ? (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          You won <span className="font-semibold">{winReward.label}</span> from the {activeTier}-day streak case.
        </div>
      ) : null}
    </section>
  );
}

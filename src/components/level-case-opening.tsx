"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LEVEL_CASE_SEGMENTS } from "@/lib/constants";

type RewardPayload = {
  id: string;
  label: string;
  amountCents: number;
  colorClass: string;
};

type LevelCaseOpeningProps = {
  currentLevel: number;
  claimedLevel: number;
  availableKeys: number;
  canUseCase: boolean;
};

type ReelEntry = {
  id: string;
  label: string;
  colorClass: string;
};

const CARD_WIDTH = 126;
const CARD_GAP = 10;
const REEL_COUNT = 68;
const WIN_INDEX = 52;

function randomSegmentByOdds(): ReelEntry {
  const totalWeight = LEVEL_CASE_SEGMENTS.reduce((sum, item) => sum + item.chancePermille, 0);
  let roll = Math.random() * totalWeight;
  for (const segment of LEVEL_CASE_SEGMENTS) {
    roll -= segment.chancePermille;
    if (roll <= 0) {
      return { id: segment.id, label: segment.label, colorClass: segment.colorClass };
    }
  }
  const fallback = LEVEL_CASE_SEGMENTS[0];
  return { id: fallback.id, label: fallback.label, colorClass: fallback.colorClass };
}

function buildReel(winningId?: string): ReelEntry[] {
  const entries = Array.from({ length: REEL_COUNT }, () => randomSegmentByOdds());
  if (winningId) {
    const winner = LEVEL_CASE_SEGMENTS.find((segment) => segment.id === winningId);
    if (winner) {
      entries[WIN_INDEX] = { id: winner.id, label: winner.label, colorClass: winner.colorClass };
    }
  }
  return entries;
}

export function LevelCaseOpening({ currentLevel, claimedLevel, availableKeys, canUseCase }: LevelCaseOpeningProps) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [currentLevelState, setCurrentLevelState] = useState(currentLevel);
  const [claimedLevelState, setClaimedLevelState] = useState(claimedLevel);
  const [availableKeysState, setAvailableKeysState] = useState(availableKeys);
  const [trackItems, setTrackItems] = useState<ReelEntry[]>(() => buildReel());
  const [trackX, setTrackX] = useState(0);
  const [trackTransition, setTrackTransition] = useState("none");
  const [spinning, setSpinning] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winReward, setWinReward] = useState<RewardPayload | null>(null);

  const claimableLevels = useMemo(
    () => Math.max(0, currentLevelState - claimedLevelState),
    [currentLevelState, claimedLevelState],
  );
  const canOpen = !spinning && !claiming && canUseCase && availableKeysState > 0;
  const canClaim = !spinning && !claiming && canUseCase && claimableLevels > 0;

  async function claimLevels() {
    if (!canClaim) {
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const response = await fetch("/api/levels/claim", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        availableKeys?: number;
        claimedUpToLevel?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not claim level rewards.");
      }

      if (typeof payload.availableKeys === "number") {
        setAvailableKeysState(payload.availableKeys);
      }
      if (typeof payload.claimedUpToLevel === "number") {
        setClaimedLevelState(payload.claimedUpToLevel);
      }
      setError(null);
      router.refresh();
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Could not claim level rewards.");
    } finally {
      setClaiming(false);
    }
  }

  async function openCase() {
    if (!canOpen) {
      return;
    }

    setError(null);
    setWinReward(null);
    setSpinning(true);

    try {
      const response = await fetch("/api/levels/case/open", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        availableKeys?: number;
        newLevel?: number;
        reward?: RewardPayload;
      };

      if (!response.ok || !payload.reward) {
        throw new Error(payload.error || "Could not open level case.");
      }

      const items = buildReel(payload.reward.id);
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
        setAvailableKeysState(typeof payload.availableKeys === "number" ? payload.availableKeys : 0);
        if (typeof payload.newLevel === "number") {
          setCurrentLevelState(payload.newLevel);
        }
        setSpinning(false);
        router.refresh();
      }, 5400);
    } catch (openError) {
      setSpinning(false);
      setError(openError instanceof Error ? openError.message : "Could not open level case.");
    }
  }

  return (
    <section className="case-panel relative overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-rose-50 p-5 shadow-[0_16px_38px_rgba(14,165,233,0.13)]">
      <div className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-sky-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-rose-200/35 blur-3xl" />

      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Level-Up Case</h2>
          <p className="text-sm text-slate-600">
            Claim unlocked levels to receive keys, then open cases for bonus cash rewards.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={claimLevels}
            disabled={!canClaim}
            className="ui-btn ui-btn-soft rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {claiming ? "Claiming..." : "Claim Levels"}
          </button>
          <button
            type="button"
            onClick={openCase}
            disabled={!canOpen}
            className="rounded-xl bg-gradient-to-r from-orange-400 via-rose-400 to-sky-400 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200/60 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {spinning ? "Opening..." : "Open Case"}
          </button>
        </div>
      </div>

      <div className="relative mb-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <div className="case-meta rounded-lg border border-slate-200 bg-white/75 px-3 py-2">
          Current level: <span className="font-semibold">{currentLevelState}</span>
        </div>
        <div className="case-meta rounded-lg border border-slate-200 bg-white/75 px-3 py-2">
          Claimed up to: <span className="font-semibold">{claimedLevelState}</span>
        </div>
        <div className="case-meta rounded-lg border border-slate-200 bg-white/75 px-3 py-2">
          Unclaimed levels: <span className="font-semibold">{claimableLevels}</span>
        </div>
        <div className="case-meta rounded-lg border border-slate-200 bg-white/75 px-3 py-2">
          Keys available: <span className="font-semibold">{availableKeysState}</span>
        </div>
      </div>

      {!canUseCase ? (
        <p className="mb-3 text-xs font-medium text-amber-700">Your account must be active to claim or open level cases.</p>
      ) : null}
      {error ? <p className="mb-3 text-xs font-medium text-rose-700">{error}</p> : null}

      <div className="case-reel-surface relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-cyan-50 via-white to-pink-50 px-3 py-5">
        <div className="case-reel-fade-left pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-cyan-50 via-cyan-50/85 to-transparent" />
        <div className="case-reel-fade-right pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-pink-50 via-pink-50/85 to-transparent" />
        <div className="case-reel-center pointer-events-none absolute top-0 left-1/2 h-full w-[3px] -translate-x-1/2 bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.8)]" />

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
                key={`${item.id}-${index}`}
                className={`flex h-[74px] w-[126px] shrink-0 items-center justify-center rounded-xl border border-white/90 px-3 text-sm font-bold tracking-wide shadow-md ${item.colorClass}`}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {winReward ? (
        <div className="case-win mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          You won <span className="font-semibold">{winReward.label}</span>.
        </div>
      ) : null}
    </section>
  );
}

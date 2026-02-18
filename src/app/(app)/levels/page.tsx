import { LevelCaseOpening } from "@/components/level-case-opening";
import { StreakCaseOpening } from "@/components/streak-case-opening";
import { FlashMessage } from "@/components/flash-message";
import {
  LEVEL_UP_EVERY_CENTS,
  PROMO_REDEEM_UNLOCK_LEVEL,
  STREAK_DAILY_TARGET_CENTS,
  VIP_PLUS_UNLOCK_LEVEL,
  VIP_UNLOCK_LEVEL,
} from "@/lib/constants";
import {
  getLevelFromLifetimeEarnings,
  getNextLevelTargetCents,
  getProgressToNextLevel,
  getTotalLevelCaseKeysEarned,
  hasUnlockedVip,
  hasUnlockedVipPlus,
} from "@/lib/gamification";
import { formatUSD } from "@/lib/money";
import { getUserStreakSnapshot } from "@/lib/streaks";
import { requireUser } from "@/lib/auth";
import Link from "next/link";

type SearchParams = Promise<{
  notice?: string;
  error?: string;
}>;

function getLevelPerks(level: number) {
  const perks = [level === VIP_PLUS_UNLOCK_LEVEL ? "3 Level-Up Case keys" : "1 Level-Up Case key"];

  if (level === 1) {
    perks.unshift("Chat unlocked");
  }

  if (level === PROMO_REDEEM_UNLOCK_LEVEL) {
    perks.push("Promo code redeem unlocked");
  }

  if (level === VIP_UNLOCK_LEVEL) {
    perks.push("VIP role", "+3 bonus keys", "Create promo codes");
  }

  if (level === VIP_PLUS_UNLOCK_LEVEL) {
    perks.push("VIP+ role", "Withdrawal priority queue");
  }

  return perks.join(" | ");
}

export default async function LevelsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/levels");
  const params = await searchParams;
  const streak = await getUserStreakSnapshot(user.id);

  const level = getLevelFromLifetimeEarnings(user.lifetimeEarnedCents);
  const progress = getProgressToNextLevel(user.lifetimeEarnedCents);
  const nextTargetCents = getNextLevelTargetCents(level);
  const previousTargetCents = level * LEVEL_UP_EVERY_CENTS;
  const keysEarned = getTotalLevelCaseKeysEarned(level);
  const vipUnlocked = hasUnlockedVip(level);
  const vipPlusUnlocked = hasUnlockedVipPlus(level);
  const availableCaseKeys = user.levelCaseKeys;
  const claimedLevel = user.levelRewardsClaimed;

  const milestones = Array.from({ length: 50 }, (_, index) => index + 1);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.28),_transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-20 left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,_rgba(251,146,60,0.25),_transparent_70%)]" />
        <div className="relative">
          <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Level Progression
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Level up every $5 earned</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Each level grants a Level-Up Case key. Level 1 unlocks chat. Level 3 unlocks promo code redemption in the
            Referrals tab. Level 10 unlocks VIP, 3 bonus keys, and promo code creation.
          </p>
        </div>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />

      <section className="rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 text-sm text-slate-700">
        {level >= PROMO_REDEEM_UNLOCK_LEVEL ? (
          <p>
            Promo code redemption is unlocked. Go to{" "}
            <Link href="/referrals" className="font-semibold text-sky-700 hover:text-sky-800">
              Referrals
            </Link>{" "}
            to redeem codes.
          </p>
        ) : (
          <p>
            Promo code redemption unlocks at Level {PROMO_REDEEM_UNLOCK_LEVEL}. Keep leveling up, then redeem from{" "}
            <Link href="/referrals" className="font-semibold text-sky-700 hover:text-sky-800">
              Referrals
            </Link>
            .
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/45 px-4 py-3 text-sm text-slate-700">
        <p>
          Streak rule: complete at least {formatUSD(STREAK_DAILY_TARGET_CENTS)} in offers each day to keep streak progress.
          7-day and 14-day streaks unlock bonus cases.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Current Level</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Lv {level}</p>
          <p className="text-xs text-slate-500">
            {vipPlusUnlocked ? "VIP+ unlocked" : vipUnlocked ? "VIP unlocked" : `VIP at Level ${VIP_UNLOCK_LEVEL}`}
          </p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Progress to Next</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{progress}%</p>
          <p className="text-xs text-slate-500">
            {formatUSD(user.lifetimeEarnedCents)} / {formatUSD(nextTargetCents)}
          </p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Level Case Keys</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{availableCaseKeys}</p>
          <p className="text-xs text-slate-500">Total earned so far: {keysEarned}</p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Next Milestone</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatUSD(nextTargetCents)}</p>
          <p className="text-xs text-slate-500">
            {formatUSD(Math.max(0, nextTargetCents - user.lifetimeEarnedCents))} remaining
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Current Level Track</h2>
          <p className="text-xs text-slate-500">
            Level span: {formatUSD(previousTargetCents)} - {formatUSD(nextTargetCents)}
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 via-rose-400 to-sky-500 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <LevelCaseOpening
        currentLevel={level}
        claimedLevel={claimedLevel}
        availableKeys={availableCaseKeys}
        canUseCase={user.status === "ACTIVE"}
      />

      <StreakCaseOpening
        streakDays={streak.streakDays}
        todayEarnedCents={streak.todayEarnedCents}
        remainingTodayCents={streak.remainingTodayCents}
        todayQualified={streak.todayQualified}
        canKeepToday={streak.canKeepToday}
        availableCase7={streak.availableCase7}
        availableCase14={streak.availableCase14}
        claimedCase7={streak.claimedCase7}
        claimedCase14={streak.claimedCase14}
        nextMilestone={streak.nextMilestone}
        daysToNextMilestone={streak.daysToNextMilestone}
        canUseCase={user.status === "ACTIVE"}
      />

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Level Stages</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {milestones.map((stage) => {
            const unlocked = level >= stage;
            const vipStage = stage === VIP_UNLOCK_LEVEL;
            const vipPlusStage = stage === VIP_PLUS_UNLOCK_LEVEL;
            const stageTone = vipPlusStage
              ? "level-stage-vipplus"
              : vipStage
                ? "level-stage-vip"
                : unlocked
                  ? "level-stage-unlocked"
                  : "level-stage-locked";
            return (
              <article key={stage} className={`level-stage-card ${stageTone} rounded-2xl border p-4`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Level {stage}</p>
                  <span className={`level-stage-badge ${stageTone} rounded-full px-2 py-0.5 text-[10px] font-semibold`}>
                    {vipPlusStage ? "VIP+ Stage" : vipStage ? "VIP Stage" : unlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{getLevelPerks(stage)}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Reached at {formatUSD(stage * LEVEL_UP_EVERY_CENTS)} lifetime earned
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

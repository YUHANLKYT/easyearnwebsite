import Link from "next/link";

import { FlashMessage } from "@/components/flash-message";
import { GoogleReferralModal } from "@/components/google-referral-modal";
import { SignupBonusModal } from "@/components/signup-bonus-modal";
import { DISCORD_SERVER_URL, STREAK_DAILY_TARGET_CENTS, SUPPORT_EMAIL } from "@/lib/constants";
import {
  getActiveReferralWindowStart,
  getLevelFromLifetimeEarnings,
  getNextLevelTargetCents,
  getProgressToNextLevel,
  hasUnlockedChat,
} from "@/lib/gamification";
import { formatUSD } from "@/lib/money";
import { formatPendingCountdown } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";
import { getUserStreakSnapshot } from "@/lib/streaks";
import { requireUser } from "@/lib/auth";

type SearchParams = Promise<{
  notice?: string;
  error?: string;
  signupBonus?: string;
  googleReferralPrompt?: string;
  ref?: string;
  referral?: string;
}>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/dashboard");
  const params = await searchParams;
  const activeWindowStart = getActiveReferralWindowStart();

  const now = new Date();
  const [totalReferrals, activeReferrals, recentTransactions, pendingClaims, streak] = await Promise.all([
    prisma.user.count({
      where: {
        referredById: user.id,
      },
    }),
    prisma.user.count({
      where: {
        referredById: user.id,
        lastWithdrawalAt: {
          gte: activeWindowStart,
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.taskClaim.findMany({
      where: {
        userId: user.id,
        creditedAt: null,
        pendingUntil: {
          gt: now,
        },
      },
      orderBy: {
        pendingUntil: "asc",
      },
      take: 10,
      select: {
        id: true,
        taskKey: true,
        payoutCents: true,
        offerwallName: true,
        offerId: true,
        offerTitle: true,
        pendingUntil: true,
        claimedAt: true,
      },
    }),
    getUserStreakSnapshot(user.id, now),
  ]);
  const pendingBalanceCents = pendingClaims.reduce((sum, claim) => sum + claim.payoutCents, 0);
  const referralPromptCode = (params.ref || params.referral || "EASY").trim().toUpperCase();
  const showGoogleReferralPrompt =
    params.googleReferralPrompt === "1" && params.signupBonus !== "1" && !user.referredById && user.status === "ACTIVE";

  const level = getLevelFromLifetimeEarnings(user.lifetimeEarnedCents);
  const progressToNextLevel = getProgressToNextLevel(user.lifetimeEarnedCents);
  const nextLevelTargetCents = getNextLevelTargetCents(level);
  const levelProgressText = `Level ${level} - every $5 earned moves your level up.`;
  const chatUnlocked = hasUnlockedChat(user.lifetimeEarnedCents);
  const accountStatusTone =
    user.status === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : user.status === "MUTED"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";
  const metricCards = [
    {
      key: "wallet",
      label: "Wallet Balance",
      value: formatUSD(user.balanceCents),
      helper: "Available now",
      valueClass: "text-slate-900",
      chipClass: "text-sky-700 bg-sky-50 border-sky-200",
      panelGlow: "from-sky-400/20 via-sky-300/8 to-transparent",
    },
    {
      key: "pending",
      label: "Pending Balance",
      value: formatUSD(pendingBalanceCents),
      helper: `${pendingClaims.length} offer${pendingClaims.length === 1 ? "" : "s"} on hold`,
      valueClass: "text-amber-900",
      chipClass: "text-amber-700 bg-amber-50 border-amber-200",
      panelGlow: "from-amber-400/20 via-amber-300/8 to-transparent",
    },
    {
      key: "lifetime",
      label: "Lifetime Earned",
      value: formatUSD(user.lifetimeEarnedCents),
      helper: "All completed rewards",
      valueClass: "text-slate-900",
      chipClass: "text-violet-700 bg-violet-50 border-violet-200",
      panelGlow: "from-violet-400/18 via-violet-300/8 to-transparent",
    },
    {
      key: "withdrawn",
      label: "Total Withdrawn",
      value: formatUSD(user.totalWithdrawnCents),
      helper: "PayPal + gift cards",
      valueClass: "text-slate-900",
      chipClass: "text-indigo-700 bg-indigo-50 border-indigo-200",
      panelGlow: "from-indigo-400/18 via-indigo-300/8 to-transparent",
    },
    {
      key: "referrals",
      label: "Referrals",
      value: `${totalReferrals}`,
      helper: `${activeReferrals} active in 14 days`,
      valueClass: "text-slate-900",
      chipClass: "text-cyan-700 bg-cyan-50 border-cyan-200",
      panelGlow: "from-cyan-400/18 via-cyan-300/8 to-transparent",
    },
    {
      key: "streak",
      label: "Offer Streak",
      value: `${streak.streakDays} days`,
      helper: `${formatUSD(streak.todayEarnedCents)} / ${formatUSD(STREAK_DAILY_TARGET_CENTS)} today`,
      valueClass: "text-fuchsia-900",
      chipClass: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200",
      panelGlow: "from-fuchsia-400/20 via-fuchsia-300/8 to-transparent",
    },
  ] as const;

  return (
    <div className="space-y-7">
      {showGoogleReferralPrompt ? <GoogleReferralModal initialReferralCode={referralPromptCode} /> : null}
      {params.signupBonus === "1" ? <SignupBonusModal /> : null}

      <section className="dashboard-hero relative overflow-hidden rounded-3xl border p-6 shadow-[0_30px_80px_-42px_rgba(2,6,23,0.9)]">
        <div className="dashboard-hero-orb dashboard-hero-orb-cool pointer-events-none absolute -top-24 right-[-4rem] h-72 w-72 rounded-full blur-3xl" />
        <div className="dashboard-hero-orb dashboard-hero-orb-warm pointer-events-none absolute -bottom-24 left-[-5rem] h-72 w-72 rounded-full blur-3xl" />
        <div className="dashboard-hero-grid pointer-events-none absolute inset-0 bg-[size:32px_32px]" />
        <div className="relative">
          <p className="dashboard-hero-kicker inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
            Dashboard
          </p>
          <h1 className="dashboard-hero-title mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Welcome back, {user.name}
          </h1>
          <p className="dashboard-hero-copy mt-2 max-w-2xl text-sm md:text-base">
            Complete offers, build your streak, level up, and cash out quickly. Everything in your account updates in real time.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/earn"
              className="dashboard-hero-btn-primary inline-flex rounded-xl border px-4 py-2 text-sm font-semibold transition"
            >
              Start Earning
            </Link>
            <Link
              href="/store"
              className="dashboard-hero-btn-secondary inline-flex rounded-xl border px-4 py-2 text-sm font-semibold transition"
            >
              Withdraw
            </Link>
            <Link
              href="/referrals"
              className="dashboard-hero-btn-secondary inline-flex rounded-xl border px-4 py-2 text-sm font-semibold transition"
            >
              Invite Friends
            </Link>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="dashboard-hero-stat rounded-xl border px-3 py-2 text-xs">
              <p className="dashboard-hero-stat-label">Account Status</p>
              <p className="dashboard-hero-stat-value mt-1 font-semibold">{user.status}</p>
            </div>
            <div className="dashboard-hero-stat rounded-xl border px-3 py-2 text-xs">
              <p className="dashboard-hero-stat-label">Current Level</p>
              <p className="dashboard-hero-stat-value mt-1 font-semibold">Level {level}</p>
            </div>
            <div className="dashboard-hero-stat rounded-xl border px-3 py-2 text-xs">
              <p className="dashboard-hero-stat-label">Chat Access</p>
              <p className="dashboard-hero-stat-value mt-1 font-semibold">{chatUnlocked ? "Unlocked" : "Locked"}</p>
            </div>
            <div className="dashboard-hero-stat rounded-xl border px-3 py-2 text-xs">
              <p className="dashboard-hero-stat-label">Next Level At</p>
              <p className="dashboard-hero-stat-value mt-1 font-semibold">{formatUSD(nextLevelTargetCents)}</p>
            </div>
          </div>
        </div>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />
      {user.status === "MUTED" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is currently muted. Earning, wheel spins, and withdrawals are disabled until reactivated by admin.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => (
          <article key={card.key} className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.panelGlow}`} />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-semibold tracking-tight ${card.valueClass}`}>{card.value}</p>
              <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${card.chipClass}`}>
                {card.helper}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.28fr_0.92fr]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/35 p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-amber-900">Pending Offer Credits</h2>
              <span className="rounded-full border border-amber-300 bg-white/90 px-3 py-1 text-xs font-semibold text-amber-800">
                {formatUSD(pendingBalanceCents)} pending
              </span>
            </div>
            <p className="text-sm text-amber-900">
              Offers above $3.00 are temporarily pending for fraud prevention. Pending credits do not increase level until
              released.
            </p>
            <p className="mt-2 text-xs font-medium text-amber-800">
              If you have proof of completion, submit a complaint and admin may release your pending credit earlier than
              the timer.
            </p>
            <div className="mt-4 space-y-2">
              {pendingClaims.length === 0 ? (
                <p className="rounded-xl border border-amber-200/70 bg-white/85 px-3 py-3 text-sm text-amber-800">
                  No pending offers right now.
                </p>
              ) : (
                pendingClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="rounded-xl border border-amber-200/90 bg-white/92 px-3 py-3 text-xs text-slate-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {claim.offerTitle ?? claim.offerId ?? claim.taskKey}
                      </p>
                      <p className="font-semibold text-amber-800">{formatUSD(claim.payoutCents)}</p>
                    </div>
                    <p className="text-slate-600">
                      {claim.offerwallName} - {claim.offerId ?? "No offer ID"}
                    </p>
                    <p className="mt-1 font-semibold text-amber-700">
                      {claim.pendingUntil ? formatPendingCountdown(claim.pendingUntil, now) : "Pending review"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-50/75 via-white to-violet-50/55 p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-fuchsia-900">Daily Streak</h2>
              <span className="rounded-full border border-fuchsia-300 bg-white/90 px-3 py-1 text-xs font-semibold text-fuchsia-800">
                {streak.streakDays} days
              </span>
            </div>
            <p className="text-sm text-fuchsia-800">
              Complete at least {formatUSD(STREAK_DAILY_TARGET_CENTS)} in offers every day to keep your streak active.
            </p>
            <p className="mt-2 text-xs text-fuchsia-800">
              Today: <span className="font-semibold">{formatUSD(streak.todayEarnedCents)}</span> /{" "}
              {formatUSD(STREAK_DAILY_TARGET_CENTS)}
            </p>
            <p className="mt-1 text-xs font-semibold text-fuchsia-900">
              {streak.todayQualified
                ? "Today's streak target is completed."
                : streak.canKeepToday
                  ? `Earn ${formatUSD(streak.remainingTodayCents)} more today to keep your streak.`
                  : `Earn ${formatUSD(streak.remainingTodayCents)} today to start a new streak.`}
            </p>
            <p className="mt-2 text-xs text-fuchsia-700">
              {streak.nextMilestone
                ? `${streak.daysToNextMilestone ?? 0} day${streak.daysToNextMilestone === 1 ? "" : "s"} to the ${
                    streak.nextMilestone
                  }-day streak case.`
                : "All streak case milestones unlocked for this streak."}
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200/75 bg-white/90 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Level Progress</h2>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                Level {level}
              </span>
            </div>
            <p className="text-sm text-slate-600">{levelProgressText}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full border border-slate-200/70 bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-sky-500"
                style={{ width: `${progressToNextLevel}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {progressToNextLevel}% to next level - Next level at {formatUSD(nextLevelTargetCents)} lifetime earned
            </p>
            <p className={`mt-2 text-xs font-semibold ${chatUnlocked ? "text-sky-700" : "text-slate-500"}`}>
              {chatUnlocked ? "Chat unlocked (Level 1+)." : "Chat unlocks at Level 1."}
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200/75 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
            <div className="mt-4 space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-slate-500">No transactions yet. Start on the Earn page.</p>
              ) : (
                recentTransactions.map((entry) => {
                  const positive = entry.amountCents >= 0;
                  const pendingType = entry.type === "EARN_PENDING";
                  const releasedType = entry.type === "EARN_RELEASE";
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200/75 bg-white/95 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {entry.description}{" "}
                          {pendingType ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Pending
                            </span>
                          ) : releasedType ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                              Released
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.createdAt.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-semibold ${
                          pendingType ? "text-amber-700" : positive ? "text-sky-700" : "text-rose-700"
                        }`}
                      >
                        {positive ? "+" : "-"}
                        {formatUSD(Math.abs(entry.amountCents))}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-3xl border border-slate-200/75 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Account Snapshot</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200/75 bg-white/90 px-3 py-3">
                <p className="text-sm text-slate-600">Account status</p>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${accountStatusTone}`}>
                  {user.status}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200/75 bg-white/90 px-3 py-3">
                <p className="text-xs text-slate-500">Current progress</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Level {level} - {progressToNextLevel}% complete
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/75 bg-white/90 px-3 py-3">
                <p className="text-xs text-slate-500">Streak target</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {streak.todayQualified
                    ? "Completed for today"
                    : `${formatUSD(streak.remainingTodayCents)} needed today`}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200/75 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Submit a Complaint</h2>
            <p className="mt-1 text-sm text-slate-600">Need help with an offer or payout? Send a message to admin.</p>
            <p className="mt-1 text-xs text-slate-500">You can submit one complaint every 3 hours.</p>
            <p className="mt-1 text-xs text-slate-500">
              Need a problem solved fast? Join{" "}
              <a
                href={DISCORD_SERVER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-700 hover:text-sky-800"
              >
                Discord
              </a>
              .
            </p>
            {SUPPORT_EMAIL ? (
              <p className="mt-1 text-xs text-slate-500">
                Support email:{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-sky-700 hover:text-sky-800">
                  {SUPPORT_EMAIL}
                </a>
              </p>
            ) : null}
            <form action="/api/complaints" method="post" className="mt-4 space-y-3">
              <input type="hidden" name="redirectTo" value="/dashboard" />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Subject</span>
                <input
                  type="text"
                  name="subject"
                  minLength={4}
                  maxLength={100}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Message</span>
                <textarea
                  name="message"
                  minLength={8}
                  maxLength={1200}
                  required
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Send Complaint
              </button>
            </form>
          </article>
        </div>
      </section>
    </div>
  );
}

import { FlashMessage } from "@/components/flash-message";
import { SignupBonusModal } from "@/components/signup-bonus-modal";
import { STREAK_DAILY_TARGET_CENTS, SUPPORT_EMAIL } from "@/lib/constants";
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

  const level = getLevelFromLifetimeEarnings(user.lifetimeEarnedCents);
  const progressToNextLevel = getProgressToNextLevel(user.lifetimeEarnedCents);
  const nextLevelTargetCents = getNextLevelTargetCents(level);
  const levelProgressText = `Level ${level} - every $5 earned moves your level up.`;
  const chatUnlocked = hasUnlockedChat(user.lifetimeEarnedCents);

  return (
    <div className="space-y-6">
      {params.signupBonus === "1" ? <SignupBonusModal /> : null}

      <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,_rgba(251,146,60,0.35),_transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.3),_transparent_70%)]" />
        <div className="relative space-y-3">
          <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
            Main Menu
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back, {user.name}. Earning cash is simple with Easy Earn.
          </h1>
          <p className="max-w-2xl text-slate-600">
            Complete tasks, invite friends, and cash out in USD to PayPal or gift cards. Your account is fully
            tracked in real time.
          </p>
        </div>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />
      {user.status === "MUTED" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is currently muted. Earning, wheel spins, and withdrawals are disabled until reactivated by admin.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Wallet Balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatUSD(user.balanceCents)}</p>
          <p className="text-xs text-slate-500">USD</p>
        </article>
        <article className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
          <p className="text-sm text-amber-700">Pending Balance</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{formatUSD(pendingBalanceCents)}</p>
          <p className="text-xs text-amber-700">{pendingClaims.length} offer{pendingClaims.length === 1 ? "" : "s"} on hold</p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Lifetime Earned</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatUSD(user.lifetimeEarnedCents)}</p>
          <p className="text-xs text-slate-500">Includes referral and wheel rewards</p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Withdrawn</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatUSD(user.totalWithdrawnCents)}</p>
          <p className="text-xs text-slate-500">PayPal and gift cards</p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Referrals</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalReferrals}</p>
          <p className="text-xs text-slate-500">{activeReferrals} active in last 14 days</p>
        </article>
        <article className="rounded-3xl border border-fuchsia-100 bg-fuchsia-50/45 p-5 shadow-sm">
          <p className="text-sm text-fuchsia-700">Offer Streak</p>
          <p className="mt-2 text-2xl font-semibold text-fuchsia-900">{streak.streakDays} days</p>
          <p className="text-xs text-fuchsia-700">
            {formatUSD(streak.todayEarnedCents)} / {formatUSD(STREAK_DAILY_TARGET_CENTS)} today
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-amber-100 bg-amber-50/55 p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-amber-900">Pending Offer Credits</h2>
              <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                {formatUSD(pendingBalanceCents)} pending
              </span>
            </div>
            <p className="text-sm text-amber-800">
              Offers above $3.00 are temporarily pending for fraud prevention. Pending credits do not increase level until
              released.
            </p>
            <p className="mt-2 text-xs font-medium text-amber-800">
              If you have proof of completion, submit a complaint and admin may release your pending credit earlier than
              the timer.
            </p>
            <div className="mt-4 space-y-2">
              {pendingClaims.length === 0 ? (
                <p className="text-sm text-amber-700">No pending offers right now.</p>
              ) : (
                pendingClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="rounded-xl border border-amber-200/80 bg-white/80 px-3 py-3 text-xs text-slate-700"
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
                    <p className="font-semibold text-amber-700">
                      {claim.pendingUntil ? formatPendingCountdown(claim.pendingUntil, now) : "Pending review"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-fuchsia-100 bg-fuchsia-50/45 p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-fuchsia-900">Daily Streak</h2>
              <span className="rounded-full border border-fuchsia-200 bg-white px-3 py-1 text-xs font-semibold text-fuchsia-800">
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

          <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Level Progress</h2>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                Level {level}
              </span>
            </div>
            <p className="text-sm text-slate-600">{levelProgressText}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
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

          <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
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
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-3"
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
          <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Submit a Complaint</h2>
            <p className="mt-1 text-sm text-slate-600">Need help with an offer or payout? Send a message to admin.</p>
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

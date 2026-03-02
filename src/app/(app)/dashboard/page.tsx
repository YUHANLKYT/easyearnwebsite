import Link from "next/link";

import { FlashMessage } from "@/components/flash-message";
import { GoogleReferralModal } from "@/components/google-referral-modal";
import { SignupBonusModal } from "@/components/signup-bonus-modal";
import { DISCORD_SERVER_URL, STREAK_DAILY_TARGET_CENTS, SUPPORT_EMAIL } from "@/lib/constants";
import { getLevelFromLifetimeEarnings, getNextLevelTargetCents } from "@/lib/gamification";
import { requireUser } from "@/lib/auth";
import { formatUSD } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getUserStreakSnapshot } from "@/lib/streaks";

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
  const now = new Date();

  const [recentTransactions, streak] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getUserStreakSnapshot(user.id, now),
  ]);

  const referralPromptCode = (params.ref || params.referral || "EASY").trim().toUpperCase();
  const showGoogleReferralPrompt =
    params.googleReferralPrompt === "1" && params.signupBonus !== "1" && !user.referredById && user.status === "ACTIVE";

  const level = getLevelFromLifetimeEarnings(user.lifetimeEarnedCents);
  const nextLevelTargetCents = getNextLevelTargetCents(level);

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
      key: "withdrawn",
      label: "Total Withdrawn",
      value: formatUSD(user.totalWithdrawnCents),
      helper: "PayPal + gift cards",
      valueClass: "text-slate-900",
      chipClass: "text-indigo-700 bg-indigo-50 border-indigo-200",
      panelGlow: "from-indigo-400/18 via-indigo-300/8 to-transparent",
    },
    {
      key: "level",
      label: "Current Level",
      value: `Level ${level}`,
      helper: `Next level at ${formatUSD(nextLevelTargetCents)}`,
      valueClass: "text-slate-900",
      chipClass: "text-violet-700 bg-violet-50 border-violet-200",
      panelGlow: "from-violet-400/18 via-violet-300/8 to-transparent",
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
          <h1 className="dashboard-hero-title mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Welcome back, {user.name}</h1>
          <p className="dashboard-hero-copy mt-2 max-w-2xl text-sm md:text-base">
            Track your balance, streak, and recent activity. Use Earn to complete offers and Store to withdraw.
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
              Open Store
            </Link>
            <Link
              href="/referrals"
              className="dashboard-hero-btn-secondary inline-flex rounded-xl border px-4 py-2 text-sm font-semibold transition"
            >
              Invite Friends <span className="ml-1 text-emerald-300">+5%</span>
            </Link>
          </div>
        </div>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />

      {user.status === "MUTED" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is currently muted. Earning, wheel spins, and withdrawals are disabled until reactivated by admin.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
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

      <section className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
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
                    <p className={`text-sm font-semibold ${pendingType ? "text-amber-700" : positive ? "text-sky-700" : "text-rose-700"}`}>
                      {positive ? "+" : "-"}
                      {formatUSD(Math.abs(entry.amountCents))}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <div className="space-y-6">
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
              Today: <span className="font-semibold">{formatUSD(streak.todayEarnedCents)}</span> / {formatUSD(STREAK_DAILY_TARGET_CENTS)}
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

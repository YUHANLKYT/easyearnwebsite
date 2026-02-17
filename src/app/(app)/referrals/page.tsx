import { FlashMessage } from "@/components/flash-message";
import { ReferralCaseOpening } from "@/components/referral-case-opening";
import {
  PROMO_REDEEM_UNLOCK_LEVEL,
  REQUIRED_ACTIVE_REFERRALS_FOR_WHEEL,
  VIP_UNLOCK_LEVEL,
  WHEEL_COOLDOWN_HOURS,
} from "@/lib/constants";
import { getActiveReferralWindowStart, getLevelFromLifetimeEarnings } from "@/lib/gamification";
import { formatUSD } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Link from "next/link";

type SearchParams = Promise<{
  notice?: string;
  error?: string;
}>;

export default async function ReferralsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/referrals");
  const params = await searchParams;
  const activeWindowStart = getActiveReferralWindowStart();
  const userLevel = getLevelFromLifetimeEarnings(user.lifetimeEarnedCents);

  const [referrals, createdPromoCodes] = await Promise.all([
    prisma.user.findMany({
      where: {
        referredById: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastWithdrawalAt: true,
        totalWithdrawnCents: true,
      },
    }),
    userLevel >= VIP_UNLOCK_LEVEL
      ? prisma.promoCode.findMany({
          where: {
            creatorId: user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const activeReferrals = referrals.filter(
    (referral) => referral.lastWithdrawalAt && referral.lastWithdrawalAt >= activeWindowStart,
  );
  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/signup?ref=${user.referralCode}`;
  const nextAvailableAt = user.wheelLastSpunAt
    ? new Date(user.wheelLastSpunAt.getTime() + WHEEL_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()
    : null;
  const canRedeemPromo = userLevel >= PROMO_REDEEM_UNLOCK_LEVEL;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Referral Program</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Share your referral link to grow your team. You earn a 5% bonus every time a referral withdraws, and unlock the
          free cash wheel after {REQUIRED_ACTIVE_REFERRALS_FOR_WHEEL} active referrals.
        </p>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />
      {user.status !== "ACTIVE" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is currently {user.status.toLowerCase()}. Referral wheel actions are disabled.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Referral Code</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{user.referralCode}</p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Referrals</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{referrals.length}</p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Active in Last 14 Days</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{activeReferrals.length}</p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Share Your Link</h2>
        <p className="mt-2 text-sm text-slate-600">Anyone signing up with this link is connected to your referral account.</p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
          {referralLink}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Redeem Promotional Code</h2>
        {canRedeemPromo ? (
          <p className="mt-2 text-sm text-slate-600">
            Redeem promo codes here. Some codes can still require a higher minimum level set by the creator.
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-700">
            Promo code redemption unlocks at Level {PROMO_REDEEM_UNLOCK_LEVEL}. You are Level {userLevel}. See{" "}
            <Link href="/levels" className="font-semibold text-sky-700 hover:text-sky-800">
              Levels
            </Link>{" "}
            for unlock progression.
          </p>
        )}
        <form action="/api/promo/redeem" method="post" className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="redirectTo" value="/referrals" />
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Code</span>
            <input
              type="text"
              name="code"
              required
              maxLength={24}
              placeholder="Enter promo code"
              disabled={!canRedeemPromo}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm uppercase text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={!canRedeemPromo}
            className="rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Redeem Code
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create Promotional Code</h2>
        {userLevel < VIP_UNLOCK_LEVEL ? (
          <p className="mt-2 text-sm text-slate-600">
            Unlock code creation at Level {VIP_UNLOCK_LEVEL}. Current level: {userLevel}.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Fund codes using your own wallet balance. You can set audience, max uses, and minimum level requirement.
            </p>
            <form action="/api/promo/create" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="redirectTo" value="/referrals" />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Code</span>
                <input
                  type="text"
                  name="code"
                  required
                  minLength={4}
                  maxLength={24}
                  placeholder="MYCODE"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm uppercase text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Reward (USD)</span>
                <input
                  type="number"
                  name="rewardAmount"
                  required
                  min="0.05"
                  max="10"
                  step="0.01"
                  defaultValue="0.25"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Max Uses</span>
                <input
                  type="number"
                  name="maxUses"
                  required
                  min="1"
                  max="500"
                  defaultValue="25"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Minimum Level Required</span>
                <input
                  type="number"
                  name="minLevel"
                  required
                  min="0"
                  max="100"
                  defaultValue="0"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Audience</span>
                <select
                  name="audience"
                  defaultValue="EVERYONE"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
                >
                  <option value="EVERYONE">Everyone</option>
                  <option value="REFERRAL_ONLY">Referral Only</option>
                </select>
              </label>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 md:col-span-2"
              >
                Create Promo Code
              </button>
            </form>

            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">Your Promo Codes</h3>
              {createdPromoCodes.length === 0 ? (
                <p className="text-sm text-slate-500">No promo codes created yet.</p>
              ) : (
                createdPromoCodes.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{promo.code}</p>
                      <p className="text-xs text-slate-500">
                        Reward {formatUSD(promo.rewardCents)} • Min Level {promo.minLevel} • Audience{" "}
                        {promo.audience === "REFERRAL_ONLY" ? "Referral Only" : "Everyone"}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      Uses {promo.usesCount}/{promo.maxUses} • {promo.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <ReferralCaseOpening
          activeReferrals={activeReferrals.length}
          canUseCase={user.status === "ACTIVE"}
          initialNextAvailableAt={nextAvailableAt}
          adminTestMode={user.role === "ADMIN"}
        />
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Referral List</h2>
        <div className="mt-4 space-y-3">
          {referrals.length === 0 ? (
            <p className="text-sm text-slate-500">No referrals yet.</p>
          ) : (
            referrals.map((referral) => {
              const active = referral.lastWithdrawalAt && referral.lastWithdrawalAt >= activeWindowStart;
              return (
                <div
                  key={referral.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{referral.name}</p>
                    <p className="text-xs text-slate-500">
                      Joined{" "}
                      {referral.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-800">
                      Withdrawn {formatUSD(referral.totalWithdrawnCents)}
                    </p>
                    <p className={`text-xs font-semibold ${active ? "text-sky-700" : "text-slate-500"}`}>
                      {active ? "Active referral" : "Not active"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

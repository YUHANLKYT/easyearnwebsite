import Link from "next/link";
import Image from "next/image";

import { HomeHeroRotator } from "@/components/home-hero-rotator";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME, SIGNUP_BONUS_CENTS } from "@/lib/constants";
import { formatUSD } from "@/lib/money";

type SearchParams = Promise<{
  ref?: string;
}>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const referralParam = params.ref ? `?ref=${encodeURIComponent(params.ref)}` : "";
  const signedInHome = user?.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-6 flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-5 py-4 backdrop-blur">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <Image src="/easy-earn-logo.png" alt="Easy Earn" width={30} height={30} className="h-[30px] w-[30px]" />
          <span>{APP_NAME}</span>
        </span>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={signedInHome}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Dashboard
              </Link>
              <form action="/auth/signout" method="post">
                <input type="hidden" name="redirectTo" value="/" />
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href={`/signin${referralParam}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href={`/signup${referralParam}`}
                className="rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-200/60 transition hover:opacity-90"
              >
                Claim {formatUSD(SIGNUP_BONUS_CENTS)}
              </Link>
            </>
          )}
        </div>
      </header>

      <HomeHeroRotator
        isSignedIn={Boolean(user)}
        signedInHome={signedInHome}
        referralParam={referralParam}
        signupBonusText={formatUSD(SIGNUP_BONUS_CENTS)}
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Real Earnings</h2>
          <p className="mt-2 text-sm text-slate-600">
            Earn from available tasks and offers. Wallet, levels, referrals, and withdrawal flows are fully live.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Gift Cards + PayPal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Redeem through PayPal, Apple, Amazon, Google Play, Spotify, Netflix, PlayStation, Nintendo, Xbox, and more.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Referral Engine</h2>
          <p className="mt-2 text-sm text-slate-600">
            Grow your network with referral links, earn 5% withdrawal bonuses, and unlock the free cash wheel.
          </p>
        </article>
      </section>
    </main>
  );
}

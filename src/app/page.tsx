import Link from "next/link";
import Image from "next/image";
import type { IconType } from "react-icons";
import { FaAmazon, FaApple, FaCcVisa, FaGooglePlay, FaPaypal, FaPlaystation, FaSteam, FaXbox } from "react-icons/fa";

import { getCurrentUser } from "@/lib/auth";
import { APP_NAME, SIGNUP_BONUS_CENTS } from "@/lib/constants";
import { formatUSD } from "@/lib/money";

type SearchParams = Promise<{
  ref?: string;
}>;

type GiftCardVisual = {
  brand: string;
  icon: IconType;
  style: string;
  gradient: string;
  orb: string;
};

const giftCardCloud = [
  {
    brand: "Amazon",
    icon: FaAmazon,
    style: "top-[2%] left-[1%] rotate-[-14deg] gift-float-a",
    gradient: "from-amber-400 to-orange-500",
    orb: "bg-amber-300/60",
  },
  {
    brand: "Apple",
    icon: FaApple,
    style: "top-[4%] right-[4%] rotate-[10deg] gift-float-b",
    gradient: "from-slate-700 to-slate-900",
    orb: "bg-slate-300/50",
  },
  {
    brand: "Steam",
    icon: FaSteam,
    style: "top-[24%] left-[4%] rotate-[8deg] gift-float-c",
    gradient: "from-sky-500 to-indigo-500",
    orb: "bg-sky-300/55",
  },
  {
    brand: "PayPal",
    icon: FaPaypal,
    style: "top-[27%] right-[2%] rotate-[-10deg] gift-float-a",
    gradient: "from-sky-500 to-blue-700",
    orb: "bg-blue-300/55",
  },
  {
    brand: "Xbox",
    icon: FaXbox,
    style: "bottom-[22%] left-[3%] rotate-[13deg] gift-float-b",
    gradient: "from-emerald-500 to-teal-600",
    orb: "bg-emerald-300/55",
  },
  {
    brand: "PlayStation",
    icon: FaPlaystation,
    style: "bottom-[18%] right-[8%] rotate-[-11deg] gift-float-c",
    gradient: "from-indigo-500 to-violet-600",
    orb: "bg-violet-300/55",
  },
  {
    brand: "Google Play",
    icon: FaGooglePlay,
    style: "bottom-[3%] left-[15%] rotate-[-6deg] gift-float-a",
    gradient: "from-rose-500 to-orange-500",
    orb: "bg-rose-300/55",
  },
  {
    brand: "Visa",
    icon: FaCcVisa,
    style: "bottom-[1%] right-[1%] rotate-[9deg] gift-float-b",
    gradient: "from-blue-600 to-sky-500",
    orb: "bg-sky-300/50",
  },
] satisfies GiftCardVisual[];

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

      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 px-6 py-10 shadow-xl shadow-sky-100/60 md:px-10 md:py-14">
        <div className="pointer-events-none absolute inset-0 hidden md:block">
          {giftCardCloud.map((item) => (
            <div
              key={item.brand}
              className={`absolute h-[136px] w-[220px] overflow-hidden rounded-[18px] border border-white/35 bg-gradient-to-br p-4 text-white shadow-2xl ${item.style} ${item.gradient}`}
            >
              <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${item.orb}`} />
              <div className="relative flex h-full flex-col">
                <item.icon className="h-7 w-7 text-white/95" />
                <p className="mt-5 text-sm font-semibold tracking-wide">{item.brand}</p>
                <p className="text-xs font-medium text-white/80">Gift Card</p>
                <div className="mt-auto flex items-center justify-between text-[11px] font-semibold text-white/90">
                  <span>USD</span>
                  <span>Easy Earn</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_70%)]" />
        <div className="pointer-events-none absolute -right-20 -bottom-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.22),_transparent_70%)]" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <p className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-700">
            Referral Start Bonus
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Sign up with a referral code and get {formatUSD(SIGNUP_BONUS_CENTS)} free.
          </h1>
          <p className="text-2xl font-semibold tracking-tight text-sky-700 md:text-3xl">
            Average user first cashes out in 20 minutes.
          </p>
          <p className="max-w-2xl text-base text-slate-600 md:text-lg">
            Enter a valid referral code at signup to claim your {formatUSD(SIGNUP_BONUS_CENTS)} welcome bonus. No code?
            Use <span className="font-semibold">EASY</span>. Then complete offers, invite referrals, and withdraw to
            PayPal or gift cards in USD.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3">
              <p className="text-xs text-slate-500">Level System</p>
              <p className="text-sm font-semibold text-slate-900">+1 level every $5 earned</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3">
              <p className="text-xs text-slate-500">Fast Withdrawals</p>
              <p className="text-sm font-semibold text-slate-900">Withdraw starts from just $3</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3">
              <p className="text-xs text-slate-500">Referral Bonus</p>
              <p className="text-sm font-semibold text-slate-900">5% of referral withdrawals</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={user ? signedInHome : `/signup${referralParam}`}
              className="rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200/70 transition hover:opacity-90"
            >
              {user ? "Open Dashboard" : `Sign up and claim your ${formatUSD(SIGNUP_BONUS_CENTS)}`}
            </Link>
            <Link
              href="/store"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              View Withdrawal Store
            </Link>
          </div>
        </div>
      </section>

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

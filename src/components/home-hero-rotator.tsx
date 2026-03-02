"use client";

import Link from "next/link";
import type { IconType } from "react-icons";
import { FaAmazon, FaApple, FaCcVisa, FaGooglePlay, FaPaypal, FaPlaystation, FaSteam, FaXbox } from "react-icons/fa";
import { SiDiscord, SiRoblox } from "react-icons/si";

type HomeHeroRotatorProps = {
  isSignedIn: boolean;
  signedInHome: string;
  referralParam: string;
  signupBonusText: string;
};

type GiftCardVisual = {
  brand: string;
  icon: IconType;
  style: string;
  gradient: string;
  orb: string;
};

const giftCardCloud: GiftCardVisual[] = [
  {
    brand: "Amazon",
    icon: FaAmazon,
    style: "top-[2%] right-[18%] rotate-[-11deg] gift-float-a",
    gradient: "from-amber-400 to-orange-500",
    orb: "bg-amber-300/60",
  },
  {
    brand: "Apple",
    icon: FaApple,
    style: "top-[3%] right-[3%] rotate-[10deg] gift-float-b",
    gradient: "from-slate-700 to-slate-900",
    orb: "bg-slate-300/50",
  },
  {
    brand: "Steam",
    icon: FaSteam,
    style: "top-[24%] right-[16%] rotate-[7deg] gift-float-c",
    gradient: "from-sky-500 to-indigo-500",
    orb: "bg-sky-300/55",
  },
  {
    brand: "PayPal",
    icon: FaPaypal,
    style: "top-[27%] right-[0%] rotate-[-10deg] gift-float-a",
    gradient: "from-sky-500 to-blue-700",
    orb: "bg-blue-300/55",
  },
  {
    brand: "Discord Nitro",
    icon: SiDiscord,
    style: "bottom-[22%] right-[19%] rotate-[12deg] gift-float-b",
    gradient: "from-violet-500 to-indigo-600",
    orb: "bg-violet-300/55",
  },
  {
    brand: "Roblox",
    icon: SiRoblox,
    style: "bottom-[18%] right-[5%] rotate-[-11deg] gift-float-c",
    gradient: "from-indigo-500 to-violet-600",
    orb: "bg-violet-300/55",
  },
  {
    brand: "Google Play",
    icon: FaGooglePlay,
    style: "bottom-[3%] right-[17%] rotate-[-6deg] gift-float-a",
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
  {
    brand: "PlayStation",
    icon: FaPlaystation,
    style: "bottom-[38%] right-[30%] rotate-[4deg] gift-float-c",
    gradient: "from-indigo-600 to-blue-500",
    orb: "bg-indigo-300/55",
  },
  {
    brand: "Xbox",
    icon: FaXbox,
    style: "top-[43%] right-[29%] rotate-[-5deg] gift-float-a",
    gradient: "from-emerald-500 to-teal-600",
    orb: "bg-emerald-300/55",
  },
];

const MONEY_SPLIT_REGEX = /(\$\d+(?:\.\d+)?)/g;
const MONEY_EXACT_REGEX = /^\$\d+(?:\.\d+)?$/;

function highlightMoneyText(text: string) {
  return text.split(MONEY_SPLIT_REGEX).map((part, index) =>
    MONEY_EXACT_REGEX.test(part) ? (
      <span key={`money-${index}`} className="home-money-highlight">
        {part}
      </span>
    ) : (
      <span key={`text-${index}`}>{part}</span>
    ),
  );
}

export function HomeHeroRotator({ isSignedIn, signedInHome, referralParam, signupBonusText }: HomeHeroRotatorProps) {
  const primaryCtaHref = isSignedIn ? signedInHome : `/signup${referralParam}`;
  const primaryCtaLabel = isSignedIn ? "Open Dashboard" : `Sign up and claim your ${signupBonusText}`;

  return (
    <section className="home-hero-shell relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 px-6 py-10 shadow-xl shadow-sky-100/60 md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_70%)]" />
      <div className="pointer-events-none absolute -right-20 -bottom-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.22),_transparent_70%)]" />

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {giftCardCloud.map((item) => (
          <div
            key={item.brand}
            className={`absolute h-[124px] w-[204px] overflow-hidden rounded-[18px] border border-white/35 bg-gradient-to-br p-4 text-white shadow-2xl lg:h-[136px] lg:w-[220px] ${item.style} ${item.gradient}`}
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

      <div className="relative z-10 max-w-3xl space-y-5 md:max-w-[62%] md:pl-8 lg:max-w-[58%] lg:pl-10">
        <p className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-700">
          Referral Start Bonus
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
          {highlightMoneyText(`Sign up with a referral code and get ${signupBonusText} free.`)}
        </h1>
        <p className="text-2xl font-semibold tracking-tight text-sky-700 md:text-3xl">
          {highlightMoneyText("Average user first cashes out in 20 minutes.")}
        </p>
        <p className="max-w-2xl text-base text-slate-600 md:text-lg">
          {highlightMoneyText(`Enter a valid referral code at signup to claim your ${signupBonusText} welcome bonus. No code? Use `)}
          <span className="font-semibold">EASY</span>. Then complete offers, invite referrals, and withdraw to PayPal or gift cards in USD.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3">
            <p className="text-xs text-slate-500">Level System</p>
            <p className="text-sm font-semibold text-slate-900">{highlightMoneyText("+1 level every $5 earned")}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3">
            <p className="text-xs text-slate-500">Fast Withdrawals</p>
            <p className="text-sm font-semibold text-slate-900">{highlightMoneyText("Withdraw starts from just $5")}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3">
            <p className="text-xs text-slate-500">Gift Card Catalog</p>
            <p className="text-sm font-semibold text-slate-900">Up to 2400 brands</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={primaryCtaHref}
            className="rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200/70 transition hover:opacity-90"
          >
            {primaryCtaLabel}
          </Link>
          <Link
            href="/store"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            View Redemption Store
          </Link>
        </div>
      </div>
    </section>
  );
}

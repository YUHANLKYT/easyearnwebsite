"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaAmazon,
  FaApple,
  FaCcVisa,
  FaGift,
  FaGooglePlay,
  FaPaypal,
  FaPlaystation,
  FaSteam,
  FaXbox,
} from "react-icons/fa";
import { SiDiscord, SiRoblox, SiValorant } from "react-icons/si";

type HomeHeroRotatorProps = {
  isSignedIn: boolean;
  signedInHome: string;
  referralParam: string;
  signupBonusText: string;
};

type CardLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
};

type GiftCardVisual = {
  brand: string;
  icon: IconType;
  gradient: string;
  orb: string;
};

const giftCardCloud: GiftCardVisual[] = [
  { brand: "Amazon", icon: FaAmazon, gradient: "from-amber-400 to-orange-500", orb: "bg-amber-300/60" },
  { brand: "Apple", icon: FaApple, gradient: "from-slate-700 to-slate-900", orb: "bg-slate-300/50" },
  { brand: "Steam", icon: FaSteam, gradient: "from-sky-500 to-indigo-500", orb: "bg-sky-300/55" },
  { brand: "PayPal", icon: FaPaypal, gradient: "from-sky-500 to-blue-700", orb: "bg-blue-300/55" },
  { brand: "Discord Nitro", icon: SiDiscord, gradient: "from-violet-500 to-indigo-600", orb: "bg-violet-300/55" },
  { brand: "Roblox", icon: SiRoblox, gradient: "from-indigo-500 to-violet-600", orb: "bg-violet-300/55" },
  { brand: "Google Play", icon: FaGooglePlay, gradient: "from-rose-500 to-orange-500", orb: "bg-rose-300/55" },
  { brand: "Visa", icon: FaCcVisa, gradient: "from-blue-600 to-sky-500", orb: "bg-sky-300/50" },
  { brand: "PlayStation", icon: FaPlaystation, gradient: "from-indigo-600 to-blue-500", orb: "bg-indigo-300/55" },
  { brand: "Xbox", icon: FaXbox, gradient: "from-emerald-500 to-teal-600", orb: "bg-emerald-300/55" },
  { brand: "Nintendo", icon: FaGift, gradient: "from-red-500 to-rose-600", orb: "bg-red-300/55" },
  { brand: "Valorant", icon: SiValorant, gradient: "from-pink-500 to-red-500", orb: "bg-pink-300/55" },
];

const stackLayouts: CardLayout[] = [
  { left: 64, top: 6, width: 17, height: 16, rotate: -10 },
  { left: 79, top: 7, width: 17, height: 16, rotate: 10 },
  { left: 64, top: 24, width: 17, height: 16, rotate: 7 },
  { left: 79, top: 26, width: 17, height: 16, rotate: -9 },
  { left: 63, top: 44, width: 18, height: 16, rotate: 12 },
  { left: 78, top: 45, width: 18, height: 16, rotate: -11 },
  { left: 64, top: 63, width: 17, height: 16, rotate: -6 },
  { left: 79, top: 64, width: 17, height: 16, rotate: 9 },
  { left: 57, top: 53, width: 18, height: 16, rotate: 5 },
  { left: 57, top: 33, width: 18, height: 16, rotate: -6 },
  { left: 70, top: 14, width: 17, height: 15, rotate: -7 },
  { left: 70, top: 73, width: 17, height: 15, rotate: 6 },
];

const fullLayouts: CardLayout[] = [
  { left: 3, top: 14, width: 22, height: 22, rotate: 0 },
  { left: 27, top: 14, width: 22, height: 22, rotate: 0 },
  { left: 51, top: 14, width: 22, height: 22, rotate: 0 },
  { left: 75, top: 14, width: 22, height: 22, rotate: 0 },
  { left: 3, top: 39, width: 22, height: 22, rotate: 0 },
  { left: 27, top: 39, width: 22, height: 22, rotate: 0 },
  { left: 51, top: 39, width: 22, height: 22, rotate: 0 },
  { left: 75, top: 39, width: 22, height: 22, rotate: 0 },
  { left: 3, top: 64, width: 22, height: 22, rotate: 0 },
  { left: 27, top: 64, width: 22, height: 22, rotate: 0 },
  { left: 51, top: 64, width: 22, height: 22, rotate: 0 },
  { left: 75, top: 64, width: 22, height: 22, rotate: 0 },
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

function GiftCardTile({ item, compact = false }: { item: GiftCardVisual; compact?: boolean }) {
  return (
    <div className={`relative h-full w-full overflow-hidden rounded-[16px] border border-white/35 bg-gradient-to-br p-3 text-white shadow-2xl ${item.gradient}`}>
      <div className={`absolute -top-8 -right-8 h-20 w-20 rounded-full ${item.orb}`} />
      <div className="relative flex h-full flex-col">
        <item.icon className={compact ? "h-4 w-4 text-white/95" : "h-5 w-5 text-white/95"} />
        <p className={`font-semibold tracking-wide ${compact ? "mt-1 text-[10px]" : "mt-2 text-xs"}`}>{item.brand}</p>
        <p className={`font-medium text-white/85 ${compact ? "text-[9px]" : "text-[10px]"}`}>Gift Card</p>
        <div className={`mt-auto flex items-center justify-between font-semibold text-white/90 ${compact ? "text-[8px]" : "text-[9px]"}`}>
          <span>USD</span>
          <span>Easy Earn</span>
        </div>
      </div>
    </div>
  );
}

export function HomeHeroRotator({ isSignedIn, signedInHome, referralParam, signupBonusText }: HomeHeroRotatorProps) {
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setShowGrid((current) => !current);
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  const primaryCtaHref = isSignedIn ? signedInHome : `/signup${referralParam}`;
  const primaryCtaLabel = isSignedIn ? "Open Dashboard" : `Sign up and claim your ${signupBonusText}`;

  return (
    <section className="home-hero-shell relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 px-6 py-10 shadow-xl shadow-sky-100/60 md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_70%)]" />
      <div className="pointer-events-none absolute -right-20 -bottom-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.22),_transparent_70%)]" />

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.45),rgba(2,6,23,0.2),rgba(2,6,23,0.45))"
          animate={{ opacity: showGrid ? 0.4 : 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.div
          className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-950/35 px-5 py-3 text-center backdrop-blur"
          animate={{ opacity: showGrid ? 1 : 0, y: showGrid ? 0 : -18, scale: showGrid ? 1 : 0.98 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="bg-gradient-to-r from-cyan-200 via-white to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-[0.08em] text-transparent md:text-4xl">
            UP TO 2400+ BRANDS
          </p>
          <p className="mt-1 text-xs font-medium text-slate-100/90 md:text-sm">
            Redeem your money across gaming, shopping, and prepaid cards.
          </p>
        </motion.div>

        {giftCardCloud.map((item, index) => {
          const layout = showGrid ? fullLayouts[index] : stackLayouts[index];
          return (
            <motion.div
              key={item.brand}
              className="absolute z-10"
              animate={{
                left: `${layout.left}%`,
                top: `${layout.top}%`,
                width: `${layout.width}%`,
                height: `${layout.height}%`,
                rotate: layout.rotate,
                filter: ["blur(1.4px)", "blur(0px)"],
              }}
              transition={{
                duration: 0.8,
                delay: index * 0.012,
                ease: [0.22, 1, 0.36, 1],
                filter: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
              }}
              style={{ willChange: "transform, filter" }}
            >
              <motion.div
                animate={{ y: [0, -5, 0, 5, 0] }}
                transition={{
                  duration: 5.8 + (index % 4) * 0.45,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: index * 0.08,
                }}
                className="h-full w-full"
              >
                <GiftCardTile item={item} compact={showGrid} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="relative z-30 max-w-3xl space-y-5 md:max-w-[62%] md:pl-8 lg:max-w-[58%] lg:pl-10"
        animate={{ opacity: showGrid ? 0 : 1, y: showGrid ? 16 : 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: showGrid ? "none" : "auto" }}
      >
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
      </motion.div>
    </section>
  );
}

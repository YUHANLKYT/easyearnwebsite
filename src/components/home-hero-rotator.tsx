"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { FaAmazon, FaCcVisa, FaPaypal, FaSteam } from "react-icons/fa";
import { SiRoblox } from "react-icons/si";

type HomeHeroRotatorProps = {
  isSignedIn: boolean;
  signedInHome: string;
  referralParam: string;
  signupBonusText: string;
};

type HeroSpotlight = {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  body: string;
  backgroundImage: string;
  cardTone: string;
  accentOrb: string;
  mascot: IconType;
  mascotTone: string;
  lineTone: "nitro" | "soft";
};

const heroSpotlights: HeroSpotlight[] = [
  {
    id: "catalog-brands",
    kicker: "Redemption Store",
    title: "Redeem across up to 2,400 gift card brands.",
    subtitle: "One USD wallet with massive catalog coverage.",
    body: "From gaming to shopping and prepaid cards, Easy Earn supports one of the largest gift card catalogs in GPT.",
    backgroundImage:
      "linear-gradient(126deg, rgba(45,212,191,0.24) 0%, rgba(56,189,248,0.3) 38%, rgba(99,102,241,0.24) 100%)",
    cardTone: "border-cyan-200 bg-cyan-50/70 text-cyan-800",
    accentOrb: "bg-cyan-300/45",
    mascot: FaCcVisa,
    mascotTone: "text-cyan-500/30",
    lineTone: "nitro",
  },
  {
    id: "withdraw-minimum",
    kicker: "Fast Withdrawal",
    title: "Withdraw from just $5 USD.",
    subtitle: "Clear rules, tracked requests, and clean payout flow.",
    body: "Complete offers, build your wallet, and redeem once you hit the $5 minimum threshold.",
    backgroundImage:
      "linear-gradient(120deg, rgba(251,191,36,0.28) 0%, rgba(249,115,22,0.25) 42%, rgba(236,72,153,0.2) 100%)",
    cardTone: "border-amber-200 bg-amber-50/75 text-amber-900",
    accentOrb: "bg-amber-300/45",
    mascot: FaPaypal,
    mascotTone: "text-sky-500/30",
    lineTone: "soft",
  },
  {
    id: "everyday-brands",
    kicker: "Everyday Brands",
    title: "Amazon, Apple, Google Play, and hundreds more.",
    subtitle: "Shopping, entertainment, subscriptions, and prepaid.",
    body: "Search by brand, category, and currency in the Redemption Store and submit redemptions in seconds.",
    backgroundImage:
      "linear-gradient(122deg, rgba(16,185,129,0.27) 0%, rgba(45,212,191,0.24) 38%, rgba(56,189,248,0.2) 100%)",
    cardTone: "border-emerald-200 bg-emerald-50/75 text-emerald-900",
    accentOrb: "bg-emerald-300/45",
    mascot: FaAmazon,
    mascotTone: "text-emerald-500/30",
    lineTone: "soft",
  },
  {
    id: "gaming-stack",
    kicker: "Gaming Cards",
    title: "Roblox, Steam, PlayStation, Xbox, and more.",
    subtitle: "Top-up your game wallets directly from your balance.",
    body: "Use offer rewards to redeem gaming gift cards instantly from your dashboard store flow.",
    backgroundImage:
      "linear-gradient(126deg, rgba(217,70,239,0.28) 0%, rgba(139,92,246,0.3) 45%, rgba(59,130,246,0.22) 100%)",
    cardTone: "border-fuchsia-200 bg-fuchsia-50/70 text-fuchsia-800",
    accentOrb: "bg-fuchsia-300/45",
    mascot: SiRoblox,
    mascotTone: "text-fuchsia-500/30",
    lineTone: "soft",
  },
  {
    id: "always-updating",
    kicker: "Catalog Rotation",
    title: "Gift card inventory updates with new options regularly.",
    subtitle: "High-demand brands stay prioritized and easy to find.",
    body: "Prepaid, popular brands, charity options, and more are organized for faster cashout decisions.",
    backgroundImage:
      "linear-gradient(124deg, rgba(34,211,238,0.25) 0%, rgba(56,189,248,0.28) 38%, rgba(99,102,241,0.22) 100%)",
    cardTone: "border-cyan-200 bg-cyan-50/70 text-cyan-800",
    accentOrb: "bg-cyan-300/45",
    mascot: FaSteam,
    mascotTone: "text-sky-500/30",
    lineTone: "soft",
  },
];

const contentTransition = {
  initial: { opacity: 0, y: -32, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: 20,
    filter: "blur(8px)",
    transition: { duration: 0.34, ease: [0.4, 0, 1, 1] as const },
  },
};

const spotlightBackdropTransition = {
  initial: { opacity: 0, scale: 1.06, y: -20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.74, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 18,
    transition: { duration: 0.38, ease: [0.4, 0, 1, 1] as const },
  },
};

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
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setSpotlightIndex((current) => (current + 1) % heroSpotlights.length);
    }, 8000);
    return () => window.clearInterval(stepTimer);
  }, []);

  const spotlight = heroSpotlights[spotlightIndex] ?? heroSpotlights[0];

  const primaryCtaHref = isSignedIn ? signedInHome : `/signup${referralParam}`;
  const primaryCtaLabel = isSignedIn ? "Open Dashboard" : `Sign up and claim your ${signupBonusText}`;

  return (
    <section className="home-hero-shell relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 px-6 py-10 shadow-xl shadow-sky-100/60 md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`spotlight-bg-${spotlight.id}`}
            initial={spotlightBackdropTransition.initial}
            animate={spotlightBackdropTransition.animate}
            exit={spotlightBackdropTransition.exit}
            className="hero-spotlight-bg absolute inset-0"
            style={{ backgroundImage: spotlight.backgroundImage }}
          >
            <div className={`hero-spotlight-lines ${spotlight.lineTone === "nitro" ? "hero-spotlight-lines-nitro" : "hero-spotlight-lines-soft"}`} />
            <div className={`hero-spotlight-orb hero-spotlight-orb-a ${spotlight.accentOrb}`} />
            <div className={`hero-spotlight-orb hero-spotlight-orb-b ${spotlight.accentOrb}`} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_70%)]" />
      <div className="pointer-events-none absolute -right-20 -bottom-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.22),_transparent_70%)]" />

      <AnimatePresence mode="wait">
        <motion.div
          key={`mascot-${spotlight.id}`}
          initial={{ opacity: 0, x: 96, y: 20, rotate: -8, scale: 0.88 }}
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 118, damping: 13, mass: 0.8 },
          }}
          exit={{ opacity: 0, x: 72, y: -18, scale: 0.92, transition: { duration: 0.34 } }}
          className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 md:block"
        >
          <spotlight.mascot className={`hero-spotlight-mascot h-56 w-56 ${spotlight.mascotTone}`} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={spotlight ? `hero-copy-${spotlight.id}` : "hero-copy-default"}
          initial={contentTransition.initial}
          animate={contentTransition.animate}
          exit={contentTransition.exit}
          className="relative z-10 max-w-3xl space-y-5"
        >
          <div className="flex items-center gap-2">
            <p className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${spotlight.cardTone}`}>
              {spotlight.kicker}
            </p>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${spotlight.cardTone}`}>
              {spotlightIndex + 1}/{heroSpotlights.length}
            </span>
            <div className="ml-2 hidden items-center gap-1 sm:flex">
              {heroSpotlights.map((item, index) => (
                <span
                  key={item.id}
                  className={`h-1.5 rounded-full transition-all ${
                    spotlightIndex === index ? "w-5 bg-slate-900" : "w-1.5 bg-slate-400/60"
                  }`}
                />
              ))}
            </div>
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {highlightMoneyText(spotlight.title)}
          </h1>
          <p className="text-2xl font-semibold tracking-tight text-sky-700 md:text-3xl">
            {highlightMoneyText(spotlight.subtitle)}
          </p>
          <p className="max-w-2xl text-base text-slate-700 md:text-lg">{highlightMoneyText(spotlight.body)}</p>

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
              <p className="text-xs text-slate-500">Catalog Size</p>
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
              Open Redemption Store
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

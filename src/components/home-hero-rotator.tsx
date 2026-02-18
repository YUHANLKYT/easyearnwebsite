"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { FaAmazon, FaApple, FaCcVisa, FaGooglePlay, FaPaypal, FaPlaystation, FaSteam, FaXbox } from "react-icons/fa";
import { SiDiscord, SiEpicgames } from "react-icons/si";

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

const giftCardCloud: GiftCardVisual[] = [
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
];

const heroSpotlights: HeroSpotlight[] = [
  {
    id: "discord-nitro",
    kicker: "Discord Nitro Spotlight",
    title: "Withdraw Discord Nitro from just $3.",
    subtitle: "Get $1 to start and cash out in around 10 minutes.",
    body: "Complete a few fast offers, then redeem 1-month Discord Nitro directly from the Store tab.",
    backgroundImage:
      "linear-gradient(125deg, rgba(129,96,255,0.42) 0%, rgba(178,131,255,0.34) 35%, rgba(236,122,220,0.28) 68%, rgba(122,171,255,0.26) 100%)",
    cardTone: "border-violet-200 bg-violet-50/70 text-violet-800",
    accentOrb: "bg-violet-300/45",
    mascot: SiDiscord,
    mascotTone: "text-violet-500/35",
    lineTone: "nitro",
  },
  {
    id: "paypal",
    kicker: "PayPal Fastout",
    title: "Turn offer rewards into PayPal USD quickly.",
    subtitle: "Start with $1 and stack toward your first withdrawal.",
    body: "Your wallet stays in USD, and you can request PayPal cashout as soon as you reach the minimum.",
    backgroundImage:
      "linear-gradient(120deg, rgba(56,189,248,0.32) 0%, rgba(14,165,233,0.24) 40%, rgba(59,130,246,0.24) 100%)",
    cardTone: "border-sky-200 bg-sky-50/70 text-sky-800",
    accentOrb: "bg-sky-300/45",
    mascot: FaPaypal,
    mascotTone: "text-sky-500/30",
    lineTone: "soft",
  },
  {
    id: "amazon",
    kicker: "Amazon Reward Drop",
    title: "Cash out to Amazon gift cards in USD.",
    subtitle: "Popular fixed card amounts are available in one click.",
    body: "Perfect for everyday spending: complete tasks, build balance, then redeem instantly from Store.",
    backgroundImage:
      "linear-gradient(122deg, rgba(251,191,36,0.28) 0%, rgba(249,115,22,0.25) 42%, rgba(244,114,182,0.2) 100%)",
    cardTone: "border-amber-200 bg-amber-50/75 text-amber-900",
    accentOrb: "bg-amber-300/45",
    mascot: FaAmazon,
    mascotTone: "text-amber-500/30",
    lineTone: "soft",
  },
  {
    id: "fortnite",
    kicker: "Fortnite Gift Cards",
    title: "Fortnite cards ready at $15, $30, $50, and $100.",
    subtitle: "Play-focused redemptions directly from your USD balance.",
    body: "Grind offers, level up, and redeem Fortnite gift cards with fixed USD amounts in the Store.",
    backgroundImage:
      "linear-gradient(126deg, rgba(217,70,239,0.28) 0%, rgba(139,92,246,0.3) 45%, rgba(59,130,246,0.22) 100%)",
    cardTone: "border-fuchsia-200 bg-fuchsia-50/70 text-fuchsia-800",
    accentOrb: "bg-fuchsia-300/45",
    mascot: SiEpicgames,
    mascotTone: "text-fuchsia-500/30",
    lineTone: "soft",
  },
  {
    id: "steam",
    kicker: "Steam Wallet Rewards",
    title: "Redeem Steam wallet gift cards without extra steps.",
    subtitle: "Fast path from tasks to game credit.",
    body: "Use Easy Earn offers to fund your Steam purchases and keep your gaming budget topped up.",
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

export function HomeHeroRotator({ isSignedIn, signedInHome, referralParam, signupBonusText }: HomeHeroRotatorProps) {
  const [spotlightIndex, setSpotlightIndex] = useState<number>(-1);

  useEffect(() => {
    if (spotlightIndex !== -1) {
      return undefined;
    }

    const startTimer = window.setTimeout(() => setSpotlightIndex(0), 8000);
    return () => window.clearTimeout(startTimer);
  }, [spotlightIndex]);

  useEffect(() => {
    if (spotlightIndex < 0) {
      return undefined;
    }

    const stepTimer = window.setTimeout(() => {
      if (spotlightIndex >= heroSpotlights.length - 1) {
        setSpotlightIndex(-1);
        return;
      }
      setSpotlightIndex((current) => current + 1);
    }, 8000);

    return () => window.clearTimeout(stepTimer);
  }, [spotlightIndex]);

  const spotlight = useMemo(
    () => (spotlightIndex >= 0 && spotlightIndex < heroSpotlights.length ? heroSpotlights[spotlightIndex] : null),
    [spotlightIndex],
  );

  const primaryCtaHref = isSignedIn ? signedInHome : `/signup${referralParam}`;
  const primaryCtaLabel = isSignedIn ? "Open Dashboard" : `Sign up and claim your ${signupBonusText}`;

  return (
    <section className="home-hero-shell relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 px-6 py-10 shadow-xl shadow-sky-100/60 md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence mode="wait">
          {spotlight ? (
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
          ) : (
            <motion.div
              key="default-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_70%)]" />
      <div className="pointer-events-none absolute -right-20 -bottom-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.22),_transparent_70%)]" />

      {spotlight ? (
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
      ) : (
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
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={spotlight ? `hero-copy-${spotlight.id}` : "hero-copy-default"}
          initial={contentTransition.initial}
          animate={contentTransition.animate}
          exit={contentTransition.exit}
          className="relative z-10 max-w-3xl space-y-5"
        >
          {spotlight ? (
            <>
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
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">{spotlight.title}</h1>
              <p className="text-2xl font-semibold tracking-tight text-sky-700 md:text-3xl">{spotlight.subtitle}</p>
              <p className="max-w-2xl text-base text-slate-700 md:text-lg">{spotlight.body}</p>
            </>
          ) : (
            <>
              <p className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-700">
                Referral Start Bonus
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
                Sign up with a referral code and get {signupBonusText} free.
              </h1>
              <p className="text-2xl font-semibold tracking-tight text-sky-700 md:text-3xl">
                Average user first cashes out in 20 minutes.
              </p>
              <p className="max-w-2xl text-base text-slate-600 md:text-lg">
                Enter a valid referral code at signup to claim your {signupBonusText} welcome bonus. No code? Use{" "}
                <span className="font-semibold">EASY</span>. Then complete offers, invite referrals, and withdraw to PayPal
                or gift cards in USD.
              </p>
            </>
          )}

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
              href={primaryCtaHref}
              className="rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200/70 transition hover:opacity-90"
            >
              {primaryCtaLabel}
            </Link>
            <Link
              href="/store"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              View Withdrawal Store
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

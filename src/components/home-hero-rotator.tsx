"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type OfferwallVisual = {
  name: string;
  description: string;
  gradient: string;
  logo: string;
};

type HeroMode = "stack" | "brands" | "offerwalls";

const heroModes: HeroMode[] = ["stack", "brands", "offerwalls"];

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

const offerwallCards: OfferwallVisual[] = [
  {
    name: "CPX Research",
    description: "Surveys",
    gradient: "from-emerald-500 to-cyan-500",
    logo: "/cpx-research-logo.svg",
  },
  {
    name: "BitLabs",
    description: "Survey wall",
    gradient: "from-blue-500 to-indigo-500",
    logo: "/bitlabs-batterphoto.png",
  },
  {
    name: "TheoremReach",
    description: "Premium surveys",
    gradient: "from-violet-500 to-fuchsia-500",
    logo: "/theoremreach-logo.svg",
  },
  {
    name: "KiwiWall",
    description: "High paying",
    gradient: "from-lime-500 to-emerald-500",
    logo: "/kiwiwall-logo.svg",
  },
  {
    name: "Revtoo",
    description: "Mixed offers",
    gradient: "from-cyan-500 to-indigo-500",
    logo: "/revtoo-logo.svg",
  },
  {
    name: "AdtoGame",
    description: "Offerwall tasks",
    gradient: "from-orange-500 to-rose-500",
    logo: "/adtogame-logo.png",
  },
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

const gridLayouts: CardLayout[] = Array.from({ length: 12 }, (_, index) => {
  const row = Math.floor(index / 4);
  const column = index % 4;
  return {
    left: 3.5 + column * 24.5,
    top: 20 + row * 25.5,
    width: 23,
    height: 23,
    rotate: 0,
  };
});

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
    <div
      className={`relative h-full w-full overflow-hidden rounded-[16px] border border-white/35 bg-gradient-to-br p-3 text-white shadow-2xl ${item.gradient}`}
    >
      <div className={`absolute -top-8 -right-8 h-20 w-20 rounded-full ${item.orb}`} />
      <div className="relative flex h-full flex-col">
        <item.icon className={compact ? "h-4.5 w-4.5 text-white/95" : "h-5 w-5 text-white/95"} />
        <p className={`font-semibold tracking-wide ${compact ? "mt-1 text-[11px]" : "mt-2 text-xs"}`}>{item.brand}</p>
        <p className={`font-medium text-white/85 ${compact ? "text-[10px]" : "text-[10px]"}`}>Gift Card</p>
        <div
          className={`mt-auto flex items-center justify-between font-semibold text-white/90 ${compact ? "text-[9px]" : "text-[9px]"}`}
        >
          <span>USD</span>
          <span>Easy Earn</span>
        </div>
      </div>
    </div>
  );
}

function OfferwallTile({ wall }: { wall: OfferwallVisual }) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br ${wall.gradient} p-3 text-white shadow-xl`}
    >
      <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-slate-950/45" />
      <div className="relative flex h-full flex-col">
        <div className="relative h-8 w-full">
          <Image src={wall.logo} alt={`${wall.name} logo`} fill className="object-contain object-left" />
        </div>
        <p className="mt-2 text-[12px] font-semibold tracking-wide text-white/95">{wall.name}</p>
        <p className="text-[10px] font-medium text-white/90">{wall.description}</p>
        <p className="mt-auto text-[10px] font-semibold text-white/80">Integrated in Easy Earn</p>
      </div>
    </div>
  );
}

export function HomeHeroRotator({ isSignedIn, signedInHome, referralParam, signupBonusText }: HomeHeroRotatorProps) {
  const [modeIndex, setModeIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setModeIndex((current) => (current + 1) % heroModes.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const heroMode = heroModes[modeIndex] ?? "stack";
  const showBrands = heroMode === "brands";
  const showOfferwalls = heroMode === "offerwalls";
  const isOverlayMode = heroMode !== "stack";
  const activeLayouts = showBrands ? gridLayouts : stackLayouts;

  const offerwallDeck = useMemo(
    () => Array.from({ length: 12 }, (_, index) => offerwallCards[index % offerwallCards.length]),
    [],
  );

  const primaryCtaHref = isSignedIn ? signedInHome : `/signup${referralParam}`;
  const primaryCtaLabel = isSignedIn ? "Open Dashboard" : `Sign up and claim your ${signupBonusText}`;

  return (
    <section className="home-hero-shell relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 px-6 py-10 shadow-xl shadow-sky-100/60 md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_70%)]" />
      <div className="pointer-events-none absolute -right-20 -bottom-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.22),_transparent_70%)]" />

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <AnimatePresence>
          {showBrands ? (
            <motion.div
              key="brands-title"
              className="absolute top-5 left-0 right-0 z-30 text-center"
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="bg-gradient-to-r from-cyan-200 via-white to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-[0.08em] text-transparent md:text-4xl">
                UP TO 2400+ BRANDS
              </p>
              <p className="mt-1 text-xs font-medium text-slate-100/90 md:text-sm">
                Redeem your money across gaming, shopping, and prepaid cards.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showOfferwalls ? (
            <motion.div
              key="offerwalls-title"
              className="absolute top-5 left-0 right-0 z-30 text-center"
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="bg-gradient-to-r from-fuchsia-200 via-white to-cyan-200 bg-clip-text text-3xl font-extrabold tracking-[0.08em] text-transparent md:text-4xl">
                COMPLETE OFFERWALLS
              </p>
              <p className="mt-1 text-xs font-medium text-slate-100/90 md:text-sm">
                Run surveys and tasks across our integrated offerwall partners.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {giftCardCloud.map((item, index) => {
          const layout = activeLayouts[index] ?? stackLayouts[index];
          const row = Math.floor(index / 4);
          const rowDrift = row === 1 ? 13 : -13;
          return (
            <motion.div
              key={item.brand}
              className="absolute z-20"
              animate={{
                left: `${layout.left}%`,
                top: `${layout.top}%`,
                width: `${layout.width}%`,
                height: `${layout.height}%`,
                rotate: layout.rotate,
                opacity: showOfferwalls ? 0 : 1,
                filter: showOfferwalls ? "blur(5px)" : "blur(0px)",
              }}
              transition={{
                duration: 0.78,
                ease: [0.22, 1, 0.36, 1],
                opacity: { duration: 0.3, ease: "easeOut" },
              }}
              style={{ willChange: "transform, opacity, filter, width, height, left, top" }}
            >
              <motion.div
                className="h-full w-full"
                animate={
                  showBrands
                    ? { x: [0, rowDrift, 0, -rowDrift, 0], y: [0, -2, 0, 2, 0] }
                    : { x: 0, y: [0, -6, 0, 6, 0] }
                }
                transition={{
                  duration: showBrands ? 10 + row * 1.1 : 5.8 + (index % 4) * 0.45,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: index * 0.05,
                }}
              >
                <GiftCardTile item={item} compact={!showBrands} />
              </motion.div>
            </motion.div>
          );
        })}

        <AnimatePresence>
          {showOfferwalls ? (
            <motion.div
              key="offerwall-grid"
              className="absolute inset-0 z-30 px-4 pt-[22%] pb-[5%]"
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="grid h-full grid-rows-3 gap-3">
                {[0, 1, 2].map((rowIndex) => {
                  const rowCards = offerwallDeck.slice(rowIndex * 4, rowIndex * 4 + 4);
                  const rowDrift = rowIndex === 1 ? 12 : -12;
                  return (
                    <motion.div
                      key={`offerwall-row-${rowIndex}`}
                      className="grid grid-cols-4 gap-3"
                      animate={{ x: [0, rowDrift, 0, -rowDrift, 0] }}
                      transition={{
                        duration: 10 + rowIndex * 1.1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                      style={{ willChange: "transform" }}
                    >
                      {rowCards.map((wall, cardIndex) => (
                        <OfferwallTile key={`${wall.name}-${rowIndex}-${cardIndex}`} wall={wall} />
                      ))}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <motion.div
        className="relative z-30 max-w-3xl space-y-5 md:max-w-[62%] md:pl-8 lg:max-w-[58%] lg:pl-10"
        animate={{
          opacity: isOverlayMode ? 0 : 1,
          y: isOverlayMode ? 16 : 0,
          filter: isOverlayMode ? "blur(2px)" : "blur(0px)",
        }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: isOverlayMode ? "none" : "auto" }}
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
          {highlightMoneyText(
            `Enter a valid referral code at signup to claim your ${signupBonusText} welcome bonus. No code? Use `,
          )}
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

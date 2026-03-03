"use client";

import { AnimatePresence, motion } from "framer-motion";
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

type OfferwallVisual = {
  name: string;
  description: string;
  gradient: string;
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
  { name: "CPX Research", description: "Surveys", gradient: "from-emerald-500 to-cyan-500" },
  { name: "TheoremReach", description: "Premium surveys", gradient: "from-violet-500 to-fuchsia-500" },
  { name: "KiwiWall", description: "High paying", gradient: "from-lime-500 to-emerald-500" },
  { name: "Revtoo", description: "Mixed offers", gradient: "from-cyan-500 to-indigo-500" },
  { name: "AdtoGame", description: "Offerwall tasks", gradient: "from-orange-500 to-rose-500" },
  { name: "BitLabs", description: "Survey wall", gradient: "from-blue-500 to-indigo-500" },
];

const brandRows: GiftCardVisual[][] = [giftCardCloud.slice(0, 4), giftCardCloud.slice(4, 8), giftCardCloud.slice(8, 12)];

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

function SlidingBrandRow({ cards, direction, duration }: { cards: GiftCardVisual[]; direction: "left" | "right"; duration: number }) {
  const endX = direction === "left" ? "-100%" : "100%";
  const startSecond = direction === "left" ? "100%" : "-100%";

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/25">
      <motion.div
        className="absolute inset-2 flex gap-3"
        initial={{ x: 0 }}
        animate={{ x: endX }}
        transition={{ duration, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        style={{ willChange: "transform" }}
      >
        {cards.map((item) => (
          <div key={`${direction}-${item.brand}-a`} className="h-full w-[calc(25%-0.5625rem)] flex-none">
            <GiftCardTile item={item} compact />
          </div>
        ))}
      </motion.div>

      <motion.div
        className="absolute inset-2 flex gap-3"
        initial={{ x: startSecond }}
        animate={{ x: 0 }}
        transition={{ duration, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        style={{ willChange: "transform" }}
      >
        {cards.map((item) => (
          <div key={`${direction}-${item.brand}-b`} className="h-full w-[calc(25%-0.5625rem)] flex-none">
            <GiftCardTile item={item} compact />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function OfferwallCard({ wall, index }: { wall: OfferwallVisual; index: number }) {
  return (
    <motion.div
      className={`relative h-[112px] w-[244px] flex-none overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-br p-4 text-white shadow-xl ${wall.gradient}`}
      animate={{ rotateY: [0, 8, 0, -8, 0], y: [0, -4, 0, 4, 0] }}
      transition={{
        duration: 6 + (index % 3) * 0.7,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
        delay: index * 0.06,
      }}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      <div className="absolute -top-10 -right-8 h-24 w-24 rounded-full bg-white/20" />
      <p className="relative text-lg font-semibold tracking-wide">{wall.name}</p>
      <p className="relative mt-1 text-xs font-medium text-white/90">{wall.description}</p>
      <p className="relative mt-8 text-[11px] font-semibold text-white/85">Integrated in Easy Earn</p>
    </motion.div>
  );
}

function OfferwallMarquee({ cards, duration }: { cards: OfferwallVisual[]; duration: number }) {
  const repeated = [...cards, ...cards];

  return (
    <div className="relative h-[120px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/25">
      <motion.div
        className="absolute inset-y-2 left-0 flex w-max gap-3 px-2"
        initial={{ x: "-50%" }}
        animate={{ x: "0%" }}
        transition={{ duration, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        style={{ willChange: "transform" }}
      >
        {repeated.map((wall, index) => (
          <OfferwallCard key={`${wall.name}-${index}`} wall={wall} index={index} />
        ))}
      </motion.div>
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

  const primaryCtaHref = isSignedIn ? signedInHome : `/signup${referralParam}`;
  const primaryCtaLabel = isSignedIn ? "Open Dashboard" : `Sign up and claim your ${signupBonusText}`;

  return (
    <section className="home-hero-shell relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 px-6 py-10 shadow-xl shadow-sky-100/60 md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_70%)]" />
      <div className="pointer-events-none absolute -right-20 -bottom-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.22),_transparent_70%)]" />

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <AnimatePresence mode="wait">
          {showBrands ? (
            <motion.div
              key="brands-grid"
              className="absolute inset-4 z-20 rounded-2xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur"
              initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-center">
                <p className="bg-gradient-to-r from-cyan-200 via-white to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-[0.08em] text-transparent md:text-4xl">
                  UP TO 2400+ BRANDS
                </p>
                <p className="mt-1 text-xs font-medium text-slate-100/90 md:text-sm">
                  Redeem your money across gaming, shopping, and prepaid cards.
                </p>
              </div>

              <div className="mt-4 grid h-[calc(100%-4.5rem)] grid-rows-3 gap-3">
                <SlidingBrandRow cards={brandRows[0]} direction="left" duration={14} />
                <SlidingBrandRow cards={brandRows[1]} direction="right" duration={16} />
                <SlidingBrandRow cards={brandRows[2]} direction="left" duration={15} />
              </div>
            </motion.div>
          ) : showOfferwalls ? (
            <motion.div
              key="offerwalls"
              className="absolute inset-4 z-20 rounded-2xl border border-white/20 bg-slate-950/35 p-4 backdrop-blur"
              initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-center">
                <p className="bg-gradient-to-r from-fuchsia-200 via-white to-cyan-200 bg-clip-text text-3xl font-extrabold tracking-[0.08em] text-transparent md:text-4xl">
                  COMPLETE OFFERWALLS
                </p>
                <p className="mt-1 text-xs font-medium text-slate-100/90 md:text-sm">
                  Run surveys and tasks across our integrated offerwall partners.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <OfferwallMarquee cards={offerwallCards} duration={18} />
                <OfferwallMarquee cards={[...offerwallCards.slice(2), ...offerwallCards.slice(0, 2)]} duration={20} />
                <OfferwallMarquee cards={[...offerwallCards.slice(4), ...offerwallCards.slice(0, 4)]} duration={22} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="stack"
              className="absolute inset-0 z-10"
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {giftCardCloud.map((item, index) => {
                const layout = stackLayouts[index];
                return (
                  <motion.div
                    key={item.brand}
                    className="absolute z-10"
                    style={{
                      left: `${layout.left}%`,
                      top: `${layout.top}%`,
                      width: `${layout.width}%`,
                      height: `${layout.height}%`,
                      rotate: `${layout.rotate}deg`,
                      willChange: "transform",
                    }}
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0, 6, 0] }}
                      transition={{
                        duration: 5.4 + (index % 4) * 0.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: index * 0.08,
                      }}
                      className="h-full w-full"
                    >
                      <GiftCardTile item={item} compact />
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="relative z-30 max-w-3xl space-y-5 md:max-w-[62%] md:pl-8 lg:max-w-[58%] lg:pl-10"
        animate={{ opacity: isOverlayMode ? 0 : 1, y: isOverlayMode ? 16 : 0, filter: isOverlayMode ? "blur(2px)" : "blur(0px)" }}
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

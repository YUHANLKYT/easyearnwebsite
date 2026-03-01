"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type BrandMessage = {
  id: string;
  title: string;
  body: string;
};

const brandMessages: BrandMessage[] = [
  {
    id: "catalog",
    title: "Up to 2400 gift card brands",
    body: "Amazon, Apple, Roblox, Steam, PlayStation, Xbox, Visa prepaid, and more.",
  },
  {
    id: "minimum",
    title: "Withdraw from just $5 USD",
    body: "Request payouts quickly once your wallet reaches the minimum.",
  },
  {
    id: "coverage",
    title: "Gaming, shopping, prepaid, and charity",
    body: "Catalog sections are organized so users can find high-demand brands fast.",
  },
];

export function DashboardBrandRotator() {
  const [index, setIndex] = useState(0);
  const message = brandMessages[index] ?? brandMessages[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % brandMessages.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mt-4 rounded-2xl border border-white/25 bg-slate-900/45 px-4 py-3 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200/95">Gift Card Highlights</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
          transition={{ duration: 0.28 }}
          className="mt-1"
        >
          <p className="text-sm font-semibold text-white">{message.title}</p>
          <p className="text-xs text-slate-200">{message.body}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

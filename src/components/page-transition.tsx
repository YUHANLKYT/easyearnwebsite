"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const distance = prefersReducedMotion ? 0 : 28;
  const blurStart = prefersReducedMotion ? "blur(0px)" : "blur(5px)";

  const initial = { opacity: 0, x: distance, filter: blurStart };
  const animate = {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: prefersReducedMotion ? 0.16 : 0.34 },
  };
  const exit = {
    opacity: 0,
    x: -distance,
    filter: blurStart,
    transition: { duration: prefersReducedMotion ? 0.1 : 0.22 },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} initial={initial} animate={animate} exit={exit}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

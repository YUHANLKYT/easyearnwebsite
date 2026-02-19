"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const distanceX = prefersReducedMotion ? 0 : 18;
  const distanceY = prefersReducedMotion ? 0 : 10;
  const blurStart = prefersReducedMotion ? "blur(0px)" : "blur(4px)";

  const initial = { opacity: 0, x: distanceX, y: distanceY, filter: blurStart };
  const animate = {
    opacity: 1,
    x: 0,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: prefersReducedMotion ? 0.16 : 0.3 },
  };
  const exit = {
    opacity: 0,
    x: -distanceX,
    y: distanceY * -0.4,
    filter: blurStart,
    transition: { duration: prefersReducedMotion ? 0.1 : 0.18 },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} initial={initial} animate={animate} exit={exit}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

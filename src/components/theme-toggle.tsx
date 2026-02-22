"use client";

import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

type Theme = "dark" | "light";

const STORAGE_KEY = "easyearn-theme";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === "light" || stored === "dark" ? stored : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  const darkModeEnabled = theme === "dark";
  const label = darkModeEnabled ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      suppressHydrationWarning
      className="theme-toggle fixed bottom-4 left-4 z-[90] inline-flex items-center gap-2 rounded-full border border-slate-300/70 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <span className="text-base" aria-hidden>
        {darkModeEnabled ? <FiSun /> : <FiMoon />}
      </span>
      <span>{darkModeEnabled ? "Light" : "Dark"}</span>
    </button>
  );
}

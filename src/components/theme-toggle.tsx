"use client";

import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

type Theme = "dark" | "light";

const STORAGE_KEY = "easyearn-theme";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const resolvedTheme: Theme = stored === "light" || stored === "dark" ? stored : "light";
    applyTheme(resolvedTheme);
    setTheme(resolvedTheme);
  }, []);

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
      className="theme-toggle fixed bottom-4 left-4 z-[90] inline-flex items-center gap-2 rounded-full border border-slate-400/40 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur transition hover:scale-[1.02] hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <span className="text-base" aria-hidden>
        {darkModeEnabled ? <FiSun /> : <FiMoon />}
      </span>
      <span>{darkModeEnabled ? "Light" : "Dark"}</span>
    </button>
  );
}

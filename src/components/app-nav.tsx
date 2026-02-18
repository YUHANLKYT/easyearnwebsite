"use client";

import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { formatUSD } from "@/lib/money";
import { NotificationsPopover } from "@/components/notifications-popover";

type AppNavProps = {
  name: string;
  balanceCents: number;
  pendingBalanceCents: number;
  role?: "USER" | "ADMIN";
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/earn", label: "Earn" },
  { href: "/store", label: "Store" },
  { href: "/levels", label: "Levels" },
  { href: "/referrals", label: "Referrals" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({ name, balanceCents, pendingBalanceCents, role }: AppNavProps) {
  const pathname = usePathname();

  return (
    <header className="app-nav-shell sticky top-0 z-20 border-b border-slate-200/70 bg-white/75 shadow-[0_14px_38px_-28px_rgba(15,23,42,0.62)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <Image src="/easy-earn-logo.png" alt="Easy Earn" width={28} height={28} className="h-7 w-7" />
          <span className="font-bold">Easy Earn</span>
        </Link>

        <LayoutGroup id="main-nav-slider">
          <nav className="app-nav-tabs flex flex-wrap items-center gap-2 rounded-full border border-slate-200/75 bg-slate-100/75 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="app-nav-tab relative rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                >
                  {isActive ? (
                    <motion.span
                      layoutId="active-nav-pill"
                      className="app-nav-pill absolute inset-0 rounded-full bg-white shadow-[0_10px_20px_-12px_rgba(15,23,42,0.6)]"
                      transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.75 }}
                    />
                  ) : null}
                  <span className={`relative z-10 ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="flex items-center gap-3">
          {role === "ADMIN" ? (
            <a
              href="/admin"
              className="ui-btn ui-btn-danger rounded-xl border border-rose-300/70 bg-rose-100/75 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-800"
            >
              Admin
            </a>
          ) : null}
          <NotificationsPopover />
          <div className="app-nav-chip app-nav-chip-wallet rounded-2xl border border-sky-200/75 bg-gradient-to-br from-sky-50 to-white px-4 py-2 text-right shadow-[0_10px_20px_-16px_rgba(14,165,233,0.55)]">
            <p className="text-xs text-slate-500">Wallet (USD)</p>
            <p className="text-sm font-semibold text-slate-900">{formatUSD(balanceCents)}</p>
          </div>
          <div className="app-nav-chip app-nav-chip-pending rounded-2xl border border-amber-200/75 bg-gradient-to-br from-amber-50 to-white px-4 py-2 text-right shadow-[0_10px_20px_-16px_rgba(245,158,11,0.6)]">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-sm font-semibold text-slate-900">{formatUSD(pendingBalanceCents)}</p>
          </div>
          <div className="app-nav-chip hidden rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.55)] md:block">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-medium text-slate-800">{name}</p>
          </div>
          <form action="/auth/signout" method="post">
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              className="ui-btn ui-btn-soft rounded-xl border border-slate-300/75 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

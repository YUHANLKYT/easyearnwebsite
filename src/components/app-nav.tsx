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
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <Image src="/easy-earn-logo.png" alt="Easy Earn" width={28} height={28} className="h-7 w-7" />
          <span>Easy Earn</span>
        </Link>

        <LayoutGroup id="main-nav-slider">
          <nav className="flex flex-wrap items-center gap-2 rounded-full border border-rose-100 bg-rose-50/70 p-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  {isActive ? (
                    <motion.span
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-sm"
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
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
            >
              Admin
            </a>
          ) : null}
          <NotificationsPopover />
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-right">
            <p className="text-xs text-slate-500">Wallet (USD)</p>
            <p className="text-sm font-semibold text-slate-900">{formatUSD(balanceCents)}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-right">
            <p className="text-xs text-amber-700">Pending</p>
            <p className="text-sm font-semibold text-amber-900">{formatUSD(pendingBalanceCents)}</p>
          </div>
          <div className="hidden rounded-2xl border border-slate-100 bg-white px-4 py-2 md:block">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-medium text-slate-800">{name}</p>
          </div>
          <form action="/auth/signout" method="post">
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-white/70 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-4 px-4 py-4 text-center md:justify-between md:text-left md:px-8">
        <p className="text-xs font-medium text-slate-500">Easy Earn</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/privacy-policy" className="text-xs font-medium text-slate-600 transition hover:text-slate-900">
            Privacy Policy
          </Link>
          <Link href="/tos" className="text-xs font-medium text-slate-600 transition hover:text-slate-900">
            Terms of Conditions
          </Link>
          <Link href="/faq" className="text-xs font-medium text-slate-600 transition hover:text-slate-900">
            FAQ
          </Link>
        </div>
        <p className="text-xs text-slate-500">Secure payouts in USD</p>
      </div>
    </footer>
  );
}

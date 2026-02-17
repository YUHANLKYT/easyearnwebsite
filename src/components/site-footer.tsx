import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/70 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-4 px-4 py-3 md:px-8">
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
    </footer>
  );
}

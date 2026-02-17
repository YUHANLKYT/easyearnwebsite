import Link from "next/link";
import { redirect } from "next/navigation";

import { FlashMessage } from "@/components/flash-message";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeInternalRedirect } from "@/lib/validation";

type SearchParams = Promise<{
  error?: string;
  notice?: string;
  next?: string;
}>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") {
    redirect("/admin");
  }
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const nextPath = sanitizeInternalRedirect(params.next, "/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
      <div className="grid w-full gap-8 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <section className="space-y-4">
          <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
            Easy Earn
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Sign in to continue earning</h1>
          <p className="max-w-xl text-slate-600">
            Track USD balance, referrals, levels, and withdrawals in one place with secure account access.
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>Fully working login and secure sessions</li>
            <li>USD wallet with gift card and PayPal redemption</li>
            <li>Referral bonuses and active referral wheel unlock</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-600">Sign in with your account details.</p>

          <div className="mt-4">
            <FlashMessage notice={params.notice} error={params.error} />
          </div>

          <form action="/auth/signin" method="post" className="mt-4 space-y-3">
            <input type="hidden" name="next" value={nextPath} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Sign In
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            New here?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(nextPath)}`}
              className="font-semibold text-sky-700 transition hover:text-sky-800"
            >
              Create your account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { FlashMessage } from "@/components/flash-message";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeInternalRedirect } from "@/lib/validation";

type SearchParams = Promise<{
  error?: string;
  notice?: string;
  next?: string;
  ref?: string;
  referral?: string;
}>;

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") {
    redirect("/admin");
  }
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const nextPath = sanitizeInternalRedirect(params.next, "/dashboard");
  const referralCode = (params.referral || params.ref || "EASY").toUpperCase();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
      <div className="grid w-full gap-8 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm md:grid-cols-[1.05fr_0.95fr] md:p-8">
        <section className="space-y-4">
          <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Join Easy Earn
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Create your account and claim $1</h1>
          <p className="max-w-xl text-slate-600">
            Use a referral code when signing up to claim your free $1 bonus. No code yet? Use <strong>EASY</strong> and
            start earning right away.
          </p>
          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-sm text-slate-700">
            Referral perks:
            <ul className="mt-2 space-y-1">
              <li>5% bonus on every withdrawal made by your referrals</li>
              <li>Free cash wheel unlocked at 10 active referrals</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Create Account</h2>
          <p className="mt-1 text-sm text-slate-600">Use your details below to register.</p>

          <div className="mt-4">
            <FlashMessage notice={params.notice} error={params.error} />
          </div>

          <form action="/auth/signup" method="post" className="mt-4 space-y-3">
            <input type="hidden" name="next" value={nextPath} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
              <input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={40}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
              />
            </label>
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
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Referral Code</span>
              <input
                type="text"
                name="referralCode"
                defaultValue={referralCode}
                placeholder="Use EASY if you don't have one"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm uppercase text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
              />
              <span className="mt-1 block text-xs text-slate-500">
                $1 sign-up bonus is added only when you register with a valid referral code.
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="acceptLegal"
                required
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>
                Yes, I agree to the{" "}
                <Link href="/privacy-policy" className="font-semibold text-sky-700 hover:text-sky-800">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/tos" className="font-semibold text-sky-700 hover:text-sky-800">
                  Terms of Service
                </Link>
                .
              </span>
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Sign up and claim your $1
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Already registered?{" "}
            <Link
              href={`/signin?next=${encodeURIComponent(nextPath)}`}
              className="font-semibold text-sky-700 transition hover:text-sky-800"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

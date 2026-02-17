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

export default async function AdminSignInPage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role === "ADMIN") {
    redirect("/admin");
  }

  const params = await searchParams;
  const nextPath = sanitizeInternalRedirect(params.next, "/admin");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 md:px-8">
      <section className="w-full rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm md:p-8">
        <p className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
          Admin Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Easy Earn Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Monitor offers, review withdrawals, handle complaints, and moderate accounts in real time.
        </p>

        <div className="mt-4">
          <FlashMessage notice={params.notice} error={params.error} />
        </div>

        <form action="/admin/auth/signin" method="post" className="mt-4 space-y-3">
          <input type="hidden" name="next" value={nextPath} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Admin Email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@example.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Sign In as Admin
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Not admin?{" "}
          <Link href="/signin" className="font-semibold text-sky-700 transition hover:text-sky-800">
            Go to user sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

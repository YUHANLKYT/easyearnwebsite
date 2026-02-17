import { AdminConsole } from "@/components/admin-console";
import { ReferralCaseOpening } from "@/components/referral-case-opening";
import { requireAdmin } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin("/admin");

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/85 px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Admin Console</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Easy Earn Operations Panel</h1>
          <p className="text-sm text-slate-600">Signed in as {admin.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            User Dashboard
          </a>
          <form action="/auth/signout" method="post">
            <input type="hidden" name="redirectTo" value="/admin/signin" />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm">
        <ReferralCaseOpening
          activeReferrals={0}
          canUseCase={admin.status === "ACTIVE"}
          initialNextAvailableAt={null}
          adminTestMode
        />
      </section>

      <AdminConsole />
    </main>
  );
}

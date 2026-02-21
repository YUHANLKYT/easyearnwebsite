import Image from "next/image";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { buildRevtooOfferwallUrl } from "@/lib/revtoo";

export default async function RevtooPage() {
  const user = await requireUser("/revtoo");
  const revtooUrl = buildRevtooOfferwallUrl({
    userId: user.id,
  });

  return (
    <div className="space-y-6">
      <section className="page-hero rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Revtoo</h1>
            <p className="mt-2 max-w-2xl text-slate-600">Complete Revtoo offers and earn rewards in EasyEarn.</p>
          </div>
          <Link
            href="/earn"
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Back to Earn
          </Link>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <div className="revtoo-logo-shell rounded-2xl border px-4 py-4 sm:px-6">
          <Image
            src="/revtoo-logo.png"
            alt="Revtoo"
            width={905}
            height={234}
            priority
            className="h-auto w-full max-w-[240px] sm:max-w-[340px]"
          />
        </div>

        {revtooUrl ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <iframe
              title="Revtoo Offerwall"
              src={revtooUrl}
              className="h-[1200px] w-full md:h-[1600px] xl:h-[2000px]"
              loading="lazy"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Revtoo is not configured yet. Add `REVTOO_WALL_API_KEY` (or `REVTOO_APP_TOKEN`) in your environment variables.
          </div>
        )}
      </section>
    </div>
  );
}

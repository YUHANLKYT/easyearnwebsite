import Image from "next/image";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { buildKiwiWallOfferwallUrl } from "@/lib/kiwiwall";

export default async function KiwiWallPage() {
  const user = await requireUser("/kiwiwall");
  const kiwiwallUrl = buildKiwiWallOfferwallUrl({
    userId: user.id,
  });

  return (
    <div className="space-y-6">
      <section className="page-hero rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">KIWI WALL</h1>
            <p className="mt-2 max-w-2xl text-slate-600">Complete KIWI WALL offers and surveys to earn rewards in EasyEarn.</p>
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
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-6">
          <Image
            src="/kiwiwall-logo.svg"
            alt="KIWI WALL"
            width={300}
            height={68}
            priority
            className="h-auto w-full max-w-[220px] sm:max-w-[300px]"
          />
        </div>

        {kiwiwallUrl ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <iframe
              title="KIWI WALL Offerwall"
              src={kiwiwallUrl}
              className="h-[1200px] w-full md:h-[1600px] xl:h-[2000px]"
              loading="lazy"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            KIWI WALL is not configured yet. Add `KIWIWALL_WALL_TOKEN` in your environment variables.
          </div>
        )}
      </section>
    </div>
  );
}

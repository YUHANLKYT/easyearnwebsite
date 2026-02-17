import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { buildBitLabsOfferwallUrl } from "@/lib/bitlabs";

export default async function BitLabsPage() {
  const user = await requireUser("/bitlabs");
  const bitlabsUrl = buildBitLabsOfferwallUrl({
    userId: user.id,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">BitLabs</h1>
            <p className="mt-2 max-w-2xl text-slate-600">Complete BitLabs surveys and offers to earn rewards in EasyEarn.</p>
          </div>
          <Link
            href="/earn?tab=surveys"
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Back to Earn
          </Link>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        {bitlabsUrl ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <iframe
              title="BitLabs Offerwall"
              src={bitlabsUrl}
              className="h-[1200px] w-full md:h-[1600px] xl:h-[2000px]"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            BitLabs is not configured yet. Add `BITLABS_APP_TOKEN` in your environment variables.
          </div>
        )}
      </section>
    </div>
  );
}

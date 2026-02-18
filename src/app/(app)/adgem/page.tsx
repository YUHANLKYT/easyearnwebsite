import Image from "next/image";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { buildAdGemOfferwallUrl } from "@/lib/adgem";

export default async function AdGemPage() {
  const user = await requireUser("/adgem");
  const adgemUrl = buildAdGemOfferwallUrl({
    userId: user.id,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Image
              src="/adgem-logo.png"
              alt="AdGem"
              width={948}
              height={244}
              priority
              className="h-auto w-full max-w-[260px] sm:max-w-[360px]"
            />
            <p className="mt-2 max-w-2xl text-slate-600">Complete AdGem offers to earn rewards in EasyEarn.</p>
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
        <div className="rounded-2xl border border-violet-300/45 bg-[linear-gradient(135deg,rgba(59,20,120,0.92),rgba(46,16,101,0.95))] px-4 py-4 sm:px-6">
          <Image
            src="/adgem-logo.png"
            alt="AdGem"
            width={948}
            height={244}
            priority
            className="h-auto w-full max-w-[260px] sm:max-w-[360px]"
          />
        </div>

        {adgemUrl ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <iframe
              title="AdGem Offerwall"
              src={adgemUrl}
              className="h-[1200px] w-full md:h-[1600px] xl:h-[2000px]"
              loading="lazy"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            AdGem is not configured yet. Add `ADGEM_APP_ID` in your environment variables.
          </div>
        )}
      </section>
    </div>
  );
}

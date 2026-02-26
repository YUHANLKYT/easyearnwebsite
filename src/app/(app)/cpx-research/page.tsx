import Image from "next/image";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { buildCpxOfferwallUrl } from "@/lib/cpx";
import { OFFERWALL_AVAILABILITY } from "@/lib/offerwall-flags";

type SearchParams = Promise<{
  adblock_notice?: string;
}>;

export default async function CpxResearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/cpx-research");
  const params = await searchParams;
  const showAdblockNotice = params.adblock_notice === "1";
  if (!OFFERWALL_AVAILABILITY.cpx) {
    return (
      <div className="space-y-6">
        <section className="page-hero rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">CPX Research</h1>
          <p className="mt-2 max-w-2xl text-slate-600">CPX Research is temporarily disabled and marked as Coming Soon.</p>
          <Link
            href="/earn"
            className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Back to Earn
          </Link>
        </section>
      </div>
    );
  }

  const cpxSurveyUrl = buildCpxOfferwallUrl({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
  });

  return (
    <div className="space-y-6">
      <section className="page-hero rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">CPX Research</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Complete surveys to earn rewards in EasyEarn.
            </p>
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
        {showAdblockNotice ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            CPX not showing? Turn off AdBlock/privacy blockers for this page, then refresh.
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-6">
          <Image
            src="/cpx-research-logo.svg"
            alt="CPX Research"
            width={220}
            height={48}
            priority
            className="h-auto w-full max-w-[260px] sm:max-w-[340px] md:max-w-[420px]"
          />
        </div>

        {cpxSurveyUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <iframe
                title="CPX Research Offerwall"
                src={cpxSurveyUrl}
                width="100%"
                height={2000}
                frameBorder={0}
                className="block w-full"
                loading="eager"
                allow="clipboard-read; clipboard-write"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p>If the wall appears blank, disable adblock/privacy extensions for this page and reload.</p>
              <Link
                href={cpxSurveyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900"
              >
                Open CPX Directly
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            CPX is not configured yet. Add `CPX_APP_ID`. If your CPX account enforces secure hash, also add `CPX_APP_SECRET`.
          </div>
        )}
      </section>
    </div>
  );
}

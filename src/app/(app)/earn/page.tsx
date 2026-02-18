import Image from "next/image";
import Link from "next/link";

import { FlashMessage } from "@/components/flash-message";
import { requireUser } from "@/lib/auth";
import { buildBitLabsOfferwallUrl } from "@/lib/bitlabs";
import { buildCpxOfferwallUrl } from "@/lib/cpx";
import { buildTheoremReachOfferwallUrl } from "@/lib/theoremreach";

type SearchParams = Promise<{
  notice?: string;
  error?: string;
}>;

export default async function EarnPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/earn");
  const params = await searchParams;
  const cpxSurveyUrl = buildCpxOfferwallUrl({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    subId1: "surveys",
    subId2: "easyearn",
  });
  const bitlabsUrl = buildBitLabsOfferwallUrl({
    userId: user.id,
  });
  const theoremreachUrl = buildTheoremReachOfferwallUrl({
    userId: user.id,
  });
  const offerwalls = [
    {
      key: "cpx",
      name: "CPX Research",
      href: "/cpx-research",
      logoSrc: "/cpx-research-logo.svg",
      logoAlt: "CPX Research",
      logoWidth: 220,
      logoHeight: 48,
      logoClass: "h-auto w-full max-w-[260px] sm:max-w-[340px]",
      logoDisabledClass: "h-auto w-full max-w-[260px] opacity-70 sm:max-w-[340px]",
      available: Boolean(cpxSurveyUrl),
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      copy: "Integrated surveys with secure postback tracking into your EasyEarn wallet.",
      missingEnvCopy: "Missing env vars: CPX_APP_ID and CPX_APP_SECRET.",
    },
    {
      key: "bitlabs",
      name: "BitLabs",
      href: "/bitlabs",
      logoSrc: "/bitlabs-batterphoto.png",
      logoAlt: "BitLabs",
      logoWidth: 340,
      logoHeight: 72,
      logoClass: "h-auto w-full max-w-[260px] sm:max-w-[340px]",
      logoDisabledClass: "h-auto w-full max-w-[260px] opacity-70 sm:max-w-[340px]",
      available: Boolean(bitlabsUrl),
      gradient: "from-indigo-600 via-blue-600 to-cyan-500",
      copy: "Integrated offerwall and surveys with automated postback credit handling.",
      missingEnvCopy: "Missing env var: BITLABS_APP_TOKEN.",
    },
    {
      key: "theoremreach",
      name: "TheoremReach",
      href: "/theoremreach",
      logoSrc: "/theoremreach-logo.svg",
      logoAlt: "TheoremReach",
      logoWidth: 300,
      logoHeight: 72,
      logoClass: "h-auto w-full max-w-[220px] sm:max-w-[300px]",
      logoDisabledClass: "h-auto w-full max-w-[220px] opacity-70 sm:max-w-[300px]",
      available: Boolean(theoremreachUrl),
      gradient: "from-sky-600 via-blue-600 to-indigo-600",
      copy: "Integrated survey offerwall with secure callback crediting and anti-fraud pending flow.",
      missingEnvCopy: "Missing env var: THEOREMREACH_APP_TOKEN (or THEOREMREACH_APP_ID).",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Earn Money</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Open integrated offerwalls and complete offers to grow your USD wallet.
        </p>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />
      {user.status !== "ACTIVE" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is currently {user.status.toLowerCase()}. Earn actions are disabled.
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Offerwalls</h2>
          <p className="text-xs text-slate-500">Click a logo card to open the integrated wall.</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {offerwalls.map((offerwall) => (
            <article key={offerwall.key} className="overflow-hidden rounded-3xl border border-slate-100 bg-white/90 shadow-sm">
              <div className={`relative bg-gradient-to-r ${offerwall.gradient} px-4 py-4`}>
                <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/20" />
                {offerwall.available ? (
                  <Link
                    href={offerwall.href}
                    className="relative block rounded-2xl border border-white/50 bg-white/90 px-4 py-4 transition hover:bg-white"
                  >
                    <Image
                      src={offerwall.logoSrc}
                      alt={offerwall.logoAlt}
                      width={offerwall.logoWidth}
                      height={offerwall.logoHeight}
                      priority={offerwall.key === "cpx"}
                      className={offerwall.logoClass}
                    />
                  </Link>
                ) : (
                  <div className="relative rounded-2xl border border-white/50 bg-white/80 px-4 py-4">
                    <Image
                      src={offerwall.logoSrc}
                      alt={offerwall.logoAlt}
                      width={offerwall.logoWidth}
                      height={offerwall.logoHeight}
                      className={offerwall.logoDisabledClass}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <h3 className="text-base font-semibold text-slate-900">{offerwall.name}</h3>
                <p className="text-sm text-slate-600">{offerwall.copy}</p>
                {offerwall.available ? (
                  <Link
                    href={offerwall.href}
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Open {offerwall.name}
                  </Link>
                ) : (
                  <p className="text-xs font-semibold text-amber-700">{offerwall.missingEnvCopy}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Withdrawal Rules</h2>
        <p className="mt-2 text-sm text-slate-600">
          Rewards above $3.00 are held temporarily for anti-fraud review before they are released to balance and level
          progress.
        </p>
        <p className="mt-2 text-xs font-medium text-amber-700">
          Anti-fraud hold policy: rewards above $3.00 are pending before release. Pending funds do not count toward level
          until released.
        </p>
        <Link
          href="/store"
          className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          Go to Store
        </Link>
      </section>
    </div>
  );
}

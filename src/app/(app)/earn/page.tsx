import Image from "next/image";
import Link from "next/link";

import { FlashMessage } from "@/components/flash-message";
import { requireUser } from "@/lib/auth";
import { buildBitLabsOfferwallUrl } from "@/lib/bitlabs";
import { buildCpxOfferwallUrl } from "@/lib/cpx";
import { EARN_TASKS } from "@/lib/constants";
import { formatUSD } from "@/lib/money";
import { formatPendingDurationLabel, getOfferPendingDays } from "@/lib/pending-offers";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  notice?: string;
  error?: string;
  tab?: string;
}>;

function getTaskAvailability(lastClaimAt: Date | null, cooldownMinutes: number) {
  if (!lastClaimAt) {
    return { available: true, text: "Ready now" };
  }

  const now = new Date();
  const availableAt = new Date(lastClaimAt.getTime() + cooldownMinutes * 60 * 1000);

  if (availableAt <= now) {
    return { available: true, text: "Ready now" };
  }

  const diffMinutes = Math.ceil((availableAt.getTime() - now.getTime()) / 60_000);
  return {
    available: false,
    text: `Available in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`,
  };
}

type EarnTab = "surveys" | "games" | "tasks";

function getActiveTab(tab: string | undefined): EarnTab {
  if (tab === "games") {
    return "games";
  }
  if (tab === "tasks") {
    return "tasks";
  }
  return "surveys";
}

export default async function EarnPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/earn");
  const params = await searchParams;
  const activeTab = getActiveTab(params.tab);
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

  const latestClaims = await prisma.taskClaim.findMany({
    where: {
      userId: user.id,
      taskKey: {
        in: EARN_TASKS.map((task) => task.key),
      },
    },
    orderBy: {
      claimedAt: "desc",
    },
  });

  const latestClaimByTask = new Map<string, Date>();
  latestClaims.forEach((claim) => {
    if (!latestClaimByTask.has(claim.taskKey)) {
      latestClaimByTask.set(claim.taskKey, claim.claimedAt);
    }
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Earn Money</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Complete available tasks and offers to grow your USD wallet. Claim rewards, track cooldowns, and withdraw from
          Store.
        </p>
      </section>

      <FlashMessage notice={params.notice} error={params.error} />
      {user.status !== "ACTIVE" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your account is currently {user.status.toLowerCase()}. Earn actions are disabled.
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-100 bg-white/85 p-4 shadow-sm">
        <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
          <Link
            href="/earn?tab=surveys"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "surveys"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            Surveys
          </Link>
          <Link
            href="/earn?tab=games"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "games"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            Games
          </Link>
          <Link
            href="/earn?tab=tasks"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "tasks"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            Tasks
          </Link>
        </div>
      </section>

      {activeTab === "surveys" ? (
        <section className="space-y-4 rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <Link
              href="/cpx-research"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300 sm:px-6"
            >
              <Image
                src="/cpx-research-logo.svg"
                alt="CPX Research"
                width={220}
                height={48}
                priority
                className="h-auto w-full max-w-[260px] sm:max-w-[340px] md:max-w-[420px]"
              />
            </Link>
            <Link
              href="/bitlabs"
              className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-900 transition hover:border-slate-300 sm:px-6"
            >
              BitLabs
            </Link>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">Surveys Offerwall</h2>
            <p className="mt-2 text-sm text-slate-600">
              Open CPX Research or BitLabs in dedicated pages and complete surveys. Rewards are verified through postback
              and reflected in your wallet.
            </p>
          </div>

          {cpxSurveyUrl || bitlabsUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <p className="mb-3">Your survey providers are connected. Launch an offerwall below.</p>
              <div className="flex flex-wrap gap-2">
                {cpxSurveyUrl ? (
                  <Link
                    href="/cpx-research"
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Open CPX Research
                  </Link>
                ) : null}
                {bitlabsUrl ? (
                  <Link
                    href="/bitlabs"
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Open BitLabs
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Offerwalls are not configured yet. Add `CPX_APP_ID`, `CPX_APP_SECRET`, and `BITLABS_APP_TOKEN` in your
              environment variables.
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "games" ? (
        <section className="space-y-4 rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Games Offerwall</h2>
            <p className="mt-2 text-sm text-slate-600">
              This section is reserved for game offers. Add your preferred game offerwall integration here separately from
              surveys.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            No game offers are connected yet.
          </div>
        </section>
      ) : null}

      {activeTab === "tasks" ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {EARN_TASKS.map((task) => {
            const availability = getTaskAvailability(latestClaimByTask.get(task.key) ?? null, task.cooldownMinutes);
            const disabled = !availability.available || user.status !== "ACTIVE";
            const pendingDays = getOfferPendingDays(task.payoutCents);
            return (
              <article key={task.key} className="rounded-3xl border border-slate-100 bg-white/85 p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {formatUSD(task.payoutCents)}
                  </span>
                </div>
                <p className="mb-4 text-sm text-slate-600">{task.description}</p>
                <p className="mb-4 text-xs text-slate-500">
                  Cooldown: {task.cooldownMinutes} min - {availability.text}
                </p>
                <p className={`mb-4 text-xs font-medium ${pendingDays > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  Fraud hold: {formatPendingDurationLabel(pendingDays)}
                </p>
                <form action="/api/earn" method="post">
                  <input type="hidden" name="taskKey" value={task.key} />
                  <input type="hidden" name="redirectTo" value="/earn?tab=tasks" />
                  <button
                    type="submit"
                    disabled={disabled}
                    className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {user.status !== "ACTIVE" ? "Unavailable" : availability.available ? "Claim Reward" : "On Cooldown"}
                  </button>
                </form>
              </article>
            );
          })}
        </section>
      ) : null}

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

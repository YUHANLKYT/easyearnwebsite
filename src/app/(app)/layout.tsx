import { AppNav } from "@/components/app-nav";
import { LiveActivityStrip } from "@/components/live-activity-strip";
import { PageTransition } from "@/components/page-transition";
import { SideChatPopup } from "@/components/side-chat-popup";
import { requireUser } from "@/lib/auth";
import { getLevelFromLifetimeEarnings } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export default async function LoggedInLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const level = getLevelFromLifetimeEarnings(user.lifetimeEarnedCents);
  const pendingNow = new Date();
  const pendingAggregate = await prisma.taskClaim.aggregate({
    where: {
      userId: user.id,
      creditedAt: null,
      pendingUntil: {
        gt: pendingNow,
      },
    },
    _sum: {
      payoutCents: true,
    },
  });
  const pendingBalanceCents = pendingAggregate._sum.payoutCents ?? 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-28 top-24 h-64 w-64 rounded-full bg-orange-300/35 blur-3xl" />
        <div className="absolute right-[-6rem] top-40 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-300/30 blur-3xl" />
      </div>
      <AppNav name={user.name} balanceCents={user.balanceCents} pendingBalanceCents={pendingBalanceCents} role={user.role} />
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-8">
        <LiveActivityStrip />
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
        <PageTransition>{children}</PageTransition>
      </main>
      <SideChatPopup chatUnlocked={level >= 1} canSend={level >= 1 && user.status === "ACTIVE"} />
    </div>
  );
}

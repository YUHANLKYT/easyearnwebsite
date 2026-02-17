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
    <div className="min-h-screen overflow-x-hidden">
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

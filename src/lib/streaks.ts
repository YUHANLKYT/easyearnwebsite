import {
  STREAK_CASE_14_SEGMENTS,
  STREAK_CASE_7_SEGMENTS,
  STREAK_DAILY_TARGET_CENTS,
  type StreakCaseSegment,
  type StreakCaseTier,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const LOOKBACK_DAYS = 400;

type TaskClaimForStreak = {
  claimedAt: Date;
  payoutCents: number;
};

export type StreakSnapshot = {
  streakDays: number;
  streakStartDay: Date | null;
  streakEndDay: Date | null;
  todayEarnedCents: number;
  todayQualified: boolean;
  remainingTodayCents: number;
  canKeepToday: boolean;
  claimedCase7: boolean;
  claimedCase14: boolean;
  availableCase7: boolean;
  availableCase14: boolean;
  nextMilestone: 7 | 14 | null;
  daysToNextMilestone: number | null;
};

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getDailyTotals(claims: TaskClaimForStreak[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const claim of claims) {
    const key = dayKey(claim.claimedAt);
    totals.set(key, (totals.get(key) ?? 0) + claim.payoutCents);
  }
  return totals;
}

function qualifies(totals: Map<string, number>, dayStart: Date): boolean {
  return (totals.get(dayKey(dayStart)) ?? 0) >= STREAK_DAILY_TARGET_CENTS;
}

function computeStreakCore(claims: TaskClaimForStreak[], now = new Date()) {
  const totals = getDailyTotals(claims);
  const todayStart = startOfUtcDay(now);
  const yesterdayStart = addUtcDays(todayStart, -1);
  const todayEarnedCents = totals.get(dayKey(todayStart)) ?? 0;
  const todayQualified = todayEarnedCents >= STREAK_DAILY_TARGET_CENTS;

  let streakEndDay: Date | null = null;
  if (qualifies(totals, todayStart)) {
    streakEndDay = todayStart;
  } else if (qualifies(totals, yesterdayStart)) {
    streakEndDay = yesterdayStart;
  }

  if (!streakEndDay) {
    return {
      streakDays: 0,
      streakStartDay: null,
      streakEndDay: null,
      todayEarnedCents,
      todayQualified,
      remainingTodayCents: Math.max(0, STREAK_DAILY_TARGET_CENTS - todayEarnedCents),
      canKeepToday: false,
    };
  }

  let streakDays = 0;
  let cursor = streakEndDay;
  while (qualifies(totals, cursor)) {
    streakDays += 1;
    cursor = addUtcDays(cursor, -1);
  }

  return {
    streakDays,
    streakStartDay: addUtcDays(cursor, 1),
    streakEndDay,
    todayEarnedCents,
    todayQualified,
    remainingTodayCents: Math.max(0, STREAK_DAILY_TARGET_CENTS - todayEarnedCents),
    canKeepToday: !todayQualified && qualifies(totals, yesterdayStart) && streakDays > 0,
  };
}

function getMilestone(streakDays: number): { nextMilestone: 7 | 14 | null; daysToNextMilestone: number | null } {
  if (streakDays < 7) {
    return {
      nextMilestone: 7,
      daysToNextMilestone: 7 - streakDays,
    };
  }

  if (streakDays < 14) {
    return {
      nextMilestone: 14,
      daysToNextMilestone: 14 - streakDays,
    };
  }

  return {
    nextMilestone: null,
    daysToNextMilestone: null,
  };
}

export function getStreakCaseSegments(tier: StreakCaseTier): StreakCaseSegment[] {
  return tier === 14 ? STREAK_CASE_14_SEGMENTS : STREAK_CASE_7_SEGMENTS;
}

export function spinStreakCaseSegment(tier: StreakCaseTier): StreakCaseSegment {
  const segments = getStreakCaseSegments(tier);
  const totalWeight = segments.reduce((sum, segment) => sum + segment.chancePermille, 0);
  let roll = Math.random() * totalWeight;

  for (const segment of segments) {
    roll -= segment.chancePermille;
    if (roll <= 0) {
      return segment;
    }
  }

  return segments[0];
}

export async function getUserStreakSnapshot(userId: string, now = new Date()): Promise<StreakSnapshot> {
  const lookbackStart = addUtcDays(startOfUtcDay(now), -LOOKBACK_DAYS);

  const claims = await prisma.taskClaim.findMany({
    where: {
      userId,
      claimedAt: {
        gte: lookbackStart,
      },
    },
    select: {
      claimedAt: true,
      payoutCents: true,
    },
  });

  const core = computeStreakCore(claims, now);
  let claimedCase7 = false;
  let claimedCase14 = false;

  if (core.streakStartDay) {
    const opened = await prisma.streakCaseOpen.findMany({
      where: {
        userId,
        streakStartDay: core.streakStartDay,
        tier: {
          in: [7, 14],
        },
      },
      select: {
        tier: true,
      },
    });
    claimedCase7 = opened.some((entry) => entry.tier === 7);
    claimedCase14 = opened.some((entry) => entry.tier === 14);
  }

  const milestone = getMilestone(core.streakDays);
  return {
    ...core,
    claimedCase7,
    claimedCase14,
    availableCase7: Boolean(core.streakStartDay && core.streakDays >= 7 && !claimedCase7),
    availableCase14: Boolean(core.streakStartDay && core.streakDays >= 14 && !claimedCase14),
    nextMilestone: milestone.nextMilestone,
    daysToNextMilestone: milestone.daysToNextMilestone,
  };
}

export function getStreakSnapshotFromClaims(
  claims: TaskClaimForStreak[],
  streakStartDay: Date | null,
  claimedCase7: boolean,
  claimedCase14: boolean,
  now = new Date(),
): StreakSnapshot {
  const core = computeStreakCore(claims, now);
  const startMatches =
    Boolean(core.streakStartDay && streakStartDay) &&
    core.streakStartDay?.getTime() === streakStartDay?.getTime();
  const safeClaimed7 = startMatches ? claimedCase7 : false;
  const safeClaimed14 = startMatches ? claimedCase14 : false;
  const milestone = getMilestone(core.streakDays);

  return {
    ...core,
    claimedCase7: safeClaimed7,
    claimedCase14: safeClaimed14,
    availableCase7: Boolean(core.streakStartDay && core.streakDays >= 7 && !safeClaimed7),
    availableCase14: Boolean(core.streakStartDay && core.streakDays >= 14 && !safeClaimed14),
    nextMilestone: milestone.nextMilestone,
    daysToNextMilestone: milestone.daysToNextMilestone,
  };
}

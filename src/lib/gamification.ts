import {
  ACTIVE_REFERRAL_WINDOW_DAYS,
  CHAT_UNLOCK_LEVEL,
  LEVEL_CASE_SEGMENTS,
  BASE_LEVEL_KEYS_PER_LEVEL,
  LEVEL_UP_EVERY_CENTS,
  REFERRAL_BONUS_PERCENT,
  REQUIRED_ACTIVE_REFERRALS_FOR_WHEEL,
  VIP_LEVEL_BONUS_KEYS,
  VIP_PLUS_KEYS_PER_LEVEL,
  VIP_PLUS_UNLOCK_LEVEL,
  VIP_UNLOCK_LEVEL,
  type LevelCaseSegment,
  type WheelSegment,
  WHEEL_SEGMENTS,
} from "@/lib/constants";

export function getLevelFromLifetimeEarnings(lifetimeEarnedCents: number): number {
  return Math.max(0, Math.floor(lifetimeEarnedCents / LEVEL_UP_EVERY_CENTS));
}

export function getNextLevelTargetCents(currentLevel: number): number {
  return (currentLevel + 1) * LEVEL_UP_EVERY_CENTS;
}

export function getProgressToNextLevel(lifetimeEarnedCents: number): number {
  const currentLevel = getLevelFromLifetimeEarnings(lifetimeEarnedCents);
  const previousTarget = currentLevel * LEVEL_UP_EVERY_CENTS;
  const nextTarget = getNextLevelTargetCents(currentLevel);
  const withinLevel = lifetimeEarnedCents - previousTarget;
  return Math.min(100, Math.max(0, Math.round((withinLevel / (nextTarget - previousTarget)) * 100)));
}

export function hasUnlockedChat(lifetimeEarnedCents: number): boolean {
  return getLevelFromLifetimeEarnings(lifetimeEarnedCents) >= CHAT_UNLOCK_LEVEL;
}

export function hasUnlockedVip(level: number): boolean {
  return level >= VIP_UNLOCK_LEVEL;
}

export function hasUnlockedVipPlus(level: number): boolean {
  return level >= VIP_PLUS_UNLOCK_LEVEL;
}

export function getLevelCaseKeysForLevel(level: number): number {
  if (level >= VIP_PLUS_UNLOCK_LEVEL) {
    return VIP_PLUS_KEYS_PER_LEVEL;
  }
  return BASE_LEVEL_KEYS_PER_LEVEL;
}

export function getTotalLevelCaseKeysEarned(level: number): number {
  let total = hasUnlockedVip(level) ? VIP_LEVEL_BONUS_KEYS : 0;
  for (let currentLevel = 1; currentLevel <= level; currentLevel += 1) {
    total += getLevelCaseKeysForLevel(currentLevel);
  }
  return total;
}

export function getAvailableLevelCaseKeys(level: number, openedCount: number): number {
  return Math.max(0, getTotalLevelCaseKeysEarned(level) - openedCount);
}

export function getReferralBonusCents(withdrawalAmountCents: number): number {
  return Math.round(withdrawalAmountCents * REFERRAL_BONUS_PERCENT);
}

export function getActiveReferralWindowStart(now = new Date()): Date {
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - ACTIVE_REFERRAL_WINDOW_DAYS);
  return windowStart;
}

export function canSpinWheel(activeReferrals: number): boolean {
  return activeReferrals >= REQUIRED_ACTIVE_REFERRALS_FOR_WHEEL;
}

export function spinWheelRewardCents(): number {
  return spinWheelSegment().amountCents;
}

export function spinWheelSegment(): WheelSegment {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.chancePermille, 0);
  let roll = Math.random() * totalWeight;

  for (const segment of WHEEL_SEGMENTS) {
    roll -= segment.chancePermille;
    if (roll <= 0) {
      return segment;
    }
  }

  return WHEEL_SEGMENTS[0];
}

export function spinLevelCaseSegment(): LevelCaseSegment {
  const totalWeight = LEVEL_CASE_SEGMENTS.reduce((sum, segment) => sum + segment.chancePermille, 0);
  let roll = Math.random() * totalWeight;

  for (const segment of LEVEL_CASE_SEGMENTS) {
    roll -= segment.chancePermille;
    if (roll <= 0) {
      return segment;
    }
  }

  return LEVEL_CASE_SEGMENTS[0];
}

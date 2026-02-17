export const APP_NAME = "Easy Earn";

export const SESSION_COOKIE_NAME = "easyearn_session";
export const SESSION_DURATION_DAYS = 30;
export const ACTIVE_REFERRAL_WINDOW_DAYS = 14;
export const WHEEL_COOLDOWN_HOURS = 24;
export const LEVEL_UP_EVERY_CENTS = 500;
export const CHAT_UNLOCK_LEVEL = 1;
export const VIP_UNLOCK_LEVEL = 10;
export const VIP_PLUS_UNLOCK_LEVEL = 25;
export const VIP_LEVEL_BONUS_KEYS = 3;
export const BASE_LEVEL_KEYS_PER_LEVEL = 1;
export const VIP_PLUS_KEYS_PER_LEVEL = 3;
export const CHAT_MESSAGE_COOLDOWN_SECONDS = 5;
export const SIGNUP_BONUS_CENTS = 100;
const configuredSupportEmail = process.env.SUPPORT_EMAIL?.trim();
export const SUPPORT_EMAIL = configuredSupportEmail ? configuredSupportEmail : null;
export const STREAK_DAILY_TARGET_CENTS = 200;

export type EarnTask = {
  key: string;
  title: string;
  description: string;
  payoutCents: number;
  cooldownMinutes: number;
};

export const EARN_TASKS: EarnTask[] = [
  {
    key: "daily-checkin",
    title: "Daily Check-In",
    description: "Open your dashboard and claim a daily loyalty reward.",
    payoutCents: 5,
    cooldownMinutes: 24 * 60,
  },
];

export const REFERRAL_BONUS_PERCENT = 0.05;
export const REQUIRED_ACTIVE_REFERRALS_FOR_WHEEL = 10;
export const PROMO_CODE_MIN_REWARD_CENTS = 5;
export const PROMO_CODE_MAX_REWARD_CENTS = 1000;
export const PROMO_CODE_MAX_USES = 500;
export const PROMO_REDEEM_UNLOCK_LEVEL = 3;

export type PayoutRegion = "US" | "AUS" | "UK";
export type PayoutCurrency = "USD" | "AUD" | "GBP";

export type RedemptionMethod =
  | "PAYPAL"
  | "APPLE_GIFT_CARD"
  | "AMAZON_GIFT_CARD"
  | "GOOGLE_PLAY_GIFT_CARD"
  | "SPOTIFY_GIFT_CARD"
  | "NETFLIX_GIFT_CARD"
  | "PLAYSTATION_GIFT_CARD"
  | "NINTENDO_GIFT_CARD"
  | "XBOX_GIFT_CARD"
  | "STARBUCKS_GIFT_CARD"
  | "DOORDASH_GIFT_CARD"
  | "STEAM_GIFT_CARD"
  | "VALORANT_GIFT_CARD"
  | "LEAGUE_OF_LEGENDS_GIFT_CARD"
  | "DISCORD_NITRO"
  | "ROBLOX_GIFT_CARD"
  | "VISA_GIFT_CARD";

export type RedemptionOption = {
  method: RedemptionMethod;
  label: string;
  minAmountCents: number;
  description: string;
  amountChoicesCents: number[];
  amountChoicesByRegion?: Partial<Record<PayoutRegion, number[]>>;
  supportedRegions?: PayoutRegion[];
  amountChoiceLabels?: Partial<Record<number, string>>;
  amountChoiceLabelsByRegion?: Partial<Record<PayoutRegion, Partial<Record<number, string>>>>;
};

export const REDEMPTION_OPTIONS: RedemptionOption[] = [
  {
    method: "PAYPAL",
    label: "PayPal",
    minAmountCents: 500,
    description: "Instant transfer request to your PayPal account.",
    amountChoicesCents: [500, 1000, 2500, 5000, 10000],
  },
  {
    method: "APPLE_GIFT_CARD",
    label: "Apple Gift Card",
    minAmountCents: 1000,
    description: "Redeem for an Apple digital gift card.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  {
    method: "AMAZON_GIFT_CARD",
    label: "Amazon Gift Card",
    minAmountCents: 500,
    description: "Redeem for an Amazon digital gift card.",
    amountChoicesCents: [500, 1000, 2500, 5000, 10000],
  },
  {
    method: "GOOGLE_PLAY_GIFT_CARD",
    label: "Google Play Gift Card",
    minAmountCents: 1000,
    description: "Redeem for a Google Play digital card.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
    amountChoicesByRegion: {
      AUS: [2500, 5000, 10000],
    },
  },
  {
    method: "SPOTIFY_GIFT_CARD",
    label: "Spotify Gift Card",
    minAmountCents: 1000,
    description: "Redeem by Spotify subscription duration (region plans).",
    amountChoicesCents: [1000, 3000, 6000, 10000],
    amountChoicesByRegion: {
      US: [1000, 3000, 6000, 10000],
      AUS: [1400, 4200, 8400, 14000],
    },
    supportedRegions: ["US", "AUS"],
    amountChoiceLabelsByRegion: {
      US: {
        1000: "1 MONTH",
        3000: "3 MONTH",
        6000: "6 MONTH",
        10000: "12 MONTH",
      },
      AUS: {
        1400: "1 MONTH",
        4200: "3 MONTH",
        8400: "6 MONTH",
        14000: "12 MONTH",
      },
    },
  },
  {
    method: "NETFLIX_GIFT_CARD",
    label: "Netflix Gift Card",
    minAmountCents: 1000,
    description: "Redeem for Netflix balance.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  {
    method: "PLAYSTATION_GIFT_CARD",
    label: "PlayStation Gift Card",
    minAmountCents: 1000,
    description: "Redeem for PlayStation wallet balance.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  {
    method: "NINTENDO_GIFT_CARD",
    label: "Nintendo Gift Card",
    minAmountCents: 1000,
    description: "Redeem for Nintendo eShop balance.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  {
    method: "XBOX_GIFT_CARD",
    label: "Xbox Gift Card",
    minAmountCents: 1000,
    description: "Redeem for Xbox / Microsoft account balance.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  {
    method: "STARBUCKS_GIFT_CARD",
    label: "Starbucks Gift Card",
    minAmountCents: 500,
    description: "Redeem for Starbucks digital gift card.",
    amountChoicesCents: [500, 1000, 2500, 5000, 10000],
  },
  {
    method: "DOORDASH_GIFT_CARD",
    label: "DoorDash Gift Card",
    minAmountCents: 1000,
    description: "Redeem for DoorDash credits.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  {
    method: "STEAM_GIFT_CARD",
    label: "Steam Gift Card",
    minAmountCents: 2000,
    description: "Redeem for a Steam wallet gift card.",
    amountChoicesCents: [2000, 2500, 5000, 10000],
  },
  {
    method: "VALORANT_GIFT_CARD",
    label: "Valorant Gift Card",
    minAmountCents: 1000,
    description: "Redeem for Valorant points gift card.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  {
    method: "LEAGUE_OF_LEGENDS_GIFT_CARD",
    label: "League of Legends Gift Card",
    minAmountCents: 1000,
    description: "Redeem for League of Legends RP gift card.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  {
    method: "DISCORD_NITRO",
    label: "Discord Nitro",
    minAmountCents: 300,
    description: "1 month Discord Nitro options (USD only).",
    amountChoicesCents: [300, 1000],
    supportedRegions: ["US"],
    amountChoiceLabels: {
      300: "1 MONTH BASIC",
      1000: "1 MONTH NITRO",
    },
  },
  {
    method: "ROBLOX_GIFT_CARD",
    label: "Roblox Gift Card",
    minAmountCents: 1000,
    description: "Redeem for Roblox credits.",
    amountChoicesCents: [1000, 2500, 5000, 10000],
  },
  // Legacy option kept for compatibility with older redemptions.
  {
    method: "VISA_GIFT_CARD",
    label: "Visa Gift Card",
    minAmountCents: 2000,
    description: "Redeem for a prepaid Visa gift card.",
    amountChoicesCents: [2000, 2500, 5000, 10000],
  },
];

export const GIFT_CARD_METHODS: RedemptionMethod[] = REDEMPTION_OPTIONS.filter((option) => option.method !== "PAYPAL").map(
  (option) => option.method,
);

export const PAYOUT_REGION_TO_CURRENCY: Record<PayoutRegion, PayoutCurrency> = {
  US: "USD",
  AUS: "AUD",
  UK: "GBP",
};

export const REDEMPTION_LABEL_BY_METHOD = REDEMPTION_OPTIONS.reduce(
  (accumulator, option) => {
    accumulator[option.method] = option.label;
    return accumulator;
  },
  {} as Record<RedemptionMethod, string>,
);

export function getRedemptionLabel(method: string): string {
  return REDEMPTION_LABEL_BY_METHOD[method as RedemptionMethod] ?? method.replaceAll("_", " ");
}

export function getAmountChoicesForRegion(option: RedemptionOption, region: PayoutRegion): number[] {
  return option.amountChoicesByRegion?.[region] ?? option.amountChoicesCents;
}

export function getAmountChoiceLabelsForRegion(
  option: RedemptionOption,
  region: PayoutRegion,
): Partial<Record<number, string>> | undefined {
  return option.amountChoiceLabelsByRegion?.[region] ?? option.amountChoiceLabels;
}

export type WheelSegment = {
  id: string;
  label: string;
  amountCents: number;
  chancePermille: number;
  colorClass: string;
};

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: "10c", label: "$0.10", amountCents: 10, chancePermille: 300, colorClass: "bg-white text-slate-700" },
  { id: "25c", label: "$0.25", amountCents: 25, chancePermille: 300, colorClass: "bg-white text-slate-700" },
  { id: "50c", label: "$0.50", amountCents: 50, chancePermille: 270, colorClass: "bg-white text-slate-700" },
  { id: "1d", label: "$1.00", amountCents: 100, chancePermille: 80, colorClass: "bg-sky-300 text-slate-900" },
  { id: "2d50", label: "$2.50", amountCents: 250, chancePermille: 40, colorClass: "bg-fuchsia-300 text-slate-900" },
  { id: "5d", label: "$5.00", amountCents: 500, chancePermille: 8, colorClass: "bg-rose-400 text-white" },
  { id: "10d", label: "$10.00", amountCents: 1000, chancePermille: 2, colorClass: "bg-yellow-300 text-slate-900" },
];

export type LevelCaseSegment = {
  id: string;
  label: string;
  amountCents: number;
  chancePermille: number;
  colorClass: string;
};

export const LEVEL_CASE_SEGMENTS: LevelCaseSegment[] = [
  { id: "5c", label: "$0.05", amountCents: 5, chancePermille: 200, colorClass: "bg-white text-slate-700" },
  { id: "10c", label: "$0.10", amountCents: 10, chancePermille: 200, colorClass: "bg-white text-slate-700" },
  { id: "25c", label: "$0.25", amountCents: 25, chancePermille: 300, colorClass: "bg-white text-slate-700" },
  { id: "50c", label: "$0.50", amountCents: 50, chancePermille: 250, colorClass: "bg-sky-300 text-slate-900" },
  { id: "1d", label: "$1.00", amountCents: 100, chancePermille: 45, colorClass: "bg-rose-400 text-white" },
  { id: "5d", label: "$5.00", amountCents: 500, chancePermille: 5, colorClass: "bg-yellow-300 text-slate-900" },
];

export type StreakCaseTier = 7 | 14;

export type StreakCaseSegment = {
  id: string;
  label: string;
  amountCents: number;
  chancePermille: number;
  colorClass: string;
};

export const STREAK_CASE_7_SEGMENTS: StreakCaseSegment[] = [
  { id: "25c", label: "$0.25", amountCents: 25, chancePermille: 500, colorClass: "bg-white text-slate-700" },
  { id: "50c", label: "$0.50", amountCents: 50, chancePermille: 350, colorClass: "bg-sky-300 text-slate-900" },
  { id: "1d", label: "$1.00", amountCents: 100, chancePermille: 120, colorClass: "bg-indigo-300 text-slate-900" },
  { id: "2d50", label: "$2.50", amountCents: 250, chancePermille: 30, colorClass: "bg-fuchsia-300 text-slate-900" },
];

export const STREAK_CASE_14_SEGMENTS: StreakCaseSegment[] = [
  { id: "50c", label: "$0.50", amountCents: 50, chancePermille: 600, colorClass: "bg-sky-300 text-slate-900" },
  { id: "1d", label: "$1.00", amountCents: 100, chancePermille: 300, colorClass: "bg-indigo-300 text-slate-900" },
  { id: "2d50", label: "$2.50", amountCents: 250, chancePermille: 70, colorClass: "bg-fuchsia-300 text-slate-900" },
  { id: "5d", label: "$5.00", amountCents: 500, chancePermille: 30, colorClass: "bg-yellow-300 text-slate-900" },
];

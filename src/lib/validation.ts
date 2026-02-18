import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2).max(40),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(6).max(64),
    confirmPassword: z.string().min(6).max(64),
    referralCode: z.string().trim().max(32).optional(),
    acceptLegal: z.literal("on"),
    next: z.string().trim().optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(6).max(64),
  next: z.string().trim().optional(),
});

export const earnClaimSchema = z.object({
  taskKey: z.string().trim().min(1),
  redirectTo: z.string().trim().optional(),
});

export const redeemSchema = z.object({
  method: z.enum([
    "PAYPAL",
    "APPLE_GIFT_CARD",
    "AMAZON_GIFT_CARD",
    "GOOGLE_PLAY_GIFT_CARD",
    "SPOTIFY_GIFT_CARD",
    "NETFLIX_GIFT_CARD",
    "PLAYSTATION_GIFT_CARD",
    "NINTENDO_GIFT_CARD",
    "XBOX_GIFT_CARD",
    "STARBUCKS_GIFT_CARD",
    "DOORDASH_GIFT_CARD",
    "STEAM_GIFT_CARD",
    "VALORANT_GIFT_CARD",
    "LEAGUE_OF_LEGENDS_GIFT_CARD",
    "DISCORD_NITRO",
    "ROBLOX_GIFT_CARD",
    "VISA_GIFT_CARD",
    "FORTNITE_GIFT_CARD",
  ]),
  region: z.enum(["US", "AUS", "UK"]),
  amount: z.string().trim(),
  payoutEmail: z.string().trim().toLowerCase().max(160).optional(),
  discordUsername: z.string().trim().max(64).optional(),
  redirectTo: z.string().trim().optional(),
});

export const customRedeemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  amount: z.string().trim(),
  destination: z.string().trim().max(160).optional(),
  redirectTo: z.string().trim().optional(),
});

export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{4,24}$/),
  rewardAmount: z.string().trim(),
  maxUses: z.coerce.number().int().min(1).max(500),
  minLevel: z.coerce.number().int().min(0).max(100),
  audience: z.enum(["REFERRAL_ONLY", "EVERYONE"]),
  redirectTo: z.string().trim().optional(),
});

export const redeemPromoCodeSchema = z.object({
  code: z.string().trim().toUpperCase().min(4).max(24),
  redirectTo: z.string().trim().optional(),
});

export const updateProfileSettingsSchema = z.object({
  name: z.string().trim().min(2).max(40),
  anonymousMode: z.string().trim().optional(),
  redirectTo: z.string().trim().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6).max(64),
    newPassword: z.string().min(6).max(64),
    confirmPassword: z.string().min(6).max(64),
    redirectTo: z.string().trim().optional(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export const sendVerificationEmailSchema = z.object({
  redirectTo: z.string().trim().optional(),
});

export const adminManualOfferSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  offerwallName: z.string().trim().min(2).max(80),
  offerId: z.string().trim().max(80).optional(),
  offerTitle: z.string().trim().min(2).max(120),
  amount: z.string().trim(),
});

export const deleteAccountSchema = z
  .object({
    currentPassword: z.string().min(6).max(64),
    confirmText: z.string().trim(),
    redirectTo: z.string().trim().optional(),
  })
  .refine((value) => value.confirmText.toUpperCase() === "DELETE", {
    message: "Type DELETE to confirm account deletion.",
    path: ["confirmText"],
  });

export function sanitizeInternalRedirect(value?: string | null, fallback = "/dashboard"): string {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

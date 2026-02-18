import { randomUUID } from "node:crypto";

type BuildTheoremReachOfferwallUrlInput = {
  userId: string;
  transactionId?: string;
};

const DEFAULT_THEOREMREACH_APP_ID = "24653";

export function buildTheoremReachOfferwallUrl(input: BuildTheoremReachOfferwallUrlInput): string | null {
  const appToken = process.env.THEOREMREACH_APP_TOKEN?.trim();
  const appId = process.env.THEOREMREACH_APP_ID?.trim() || DEFAULT_THEOREMREACH_APP_ID;
  const apiKey = appToken || appId;
  const userId = input.userId.trim();

  if (!apiKey || !appId || !userId) {
    return null;
  }

  const tx = input.transactionId?.trim() || `${userId}-${randomUUID()}`;

  const url = new URL("https://theoremreach.com/respondent_entry/direct");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("transaction_id", tx);

  const placementId = process.env.THEOREMREACH_PLACEMENT_ID?.trim();
  if (placementId) {
    url.searchParams.set("placement_id", placementId);
  }

  return url.toString();
}

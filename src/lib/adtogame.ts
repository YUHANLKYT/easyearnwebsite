type BuildAdtoGameOfferwallUrlInput = {
  userId: string;
};

const DEFAULT_ADTOGAME_WALL_BASE_URL = "https://adtowall.com";
const DEFAULT_ADTOGAME_WALL_ID = "7658";

export function buildAdtoGameOfferwallUrl(input: BuildAdtoGameOfferwallUrlInput): string | null {
  const baseUrl = process.env.ADTOGAME_WALL_BASE_URL?.trim() || DEFAULT_ADTOGAME_WALL_BASE_URL;
  const wallId = process.env.ADTOGAME_WALL_ID?.trim() || DEFAULT_ADTOGAME_WALL_ID;
  const userId = input.userId.trim();

  if (!baseUrl || !wallId || !userId) {
    return null;
  }

  const safeBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${safeBaseUrl}/${encodeURIComponent(wallId)}/${encodeURIComponent(userId)}`;
}

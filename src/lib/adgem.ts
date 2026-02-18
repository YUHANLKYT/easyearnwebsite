type BuildAdGemOfferwallUrlInput = {
  userId: string;
};

const DEFAULT_ADGEM_APP_ID = "31989";

export function buildAdGemOfferwallUrl(input: BuildAdGemOfferwallUrlInput): string | null {
  const appId = process.env.ADGEM_APP_ID?.trim() || DEFAULT_ADGEM_APP_ID;
  const userId = input.userId.trim();

  if (!appId || !userId) {
    return null;
  }

  const url = new URL("https://adunits.adgem.com/wall");
  url.searchParams.set("appid", appId);
  url.searchParams.set("playerid", userId);

  return url.toString();
}

type BuildBitLabsOfferwallUrlInput = {
  userId: string;
};

export function buildBitLabsOfferwallUrl(input: BuildBitLabsOfferwallUrlInput): string | null {
  const appToken = process.env.BITLABS_APP_TOKEN?.trim() || "d008602c-9c1c-4d48-b0a9-21ee3da29390";
  const userId = input.userId.trim();

  if (!appToken || !userId) {
    return null;
  }

  const url = new URL("https://web.bitlabs.ai/");
  url.searchParams.set("uid", userId);
  url.searchParams.set("token", appToken);
  url.searchParams.set("sdk", "IFRAME");

  return url.toString();
}

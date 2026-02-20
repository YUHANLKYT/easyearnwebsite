type BuildRevtooOfferwallUrlInput = {
  userId: string;
};

const DEFAULT_REVTOO_WALL_API_KEY = "9qsqvkgycccyt2ftsd2dtvh1x8lzk7";

export function buildRevtooOfferwallUrl(input: BuildRevtooOfferwallUrlInput): string | null {
  const apiKey =
    process.env.REVTOO_WALL_API_KEY?.trim() ||
    process.env.REVTOO_APP_TOKEN?.trim() ||
    DEFAULT_REVTOO_WALL_API_KEY;
  const userId = input.userId.trim();

  if (!apiKey || !userId) {
    return null;
  }

  const url = new URL(`https://revtoo.com/offerwall/${apiKey}/${encodeURIComponent(userId)}`);
  return url.toString();
}

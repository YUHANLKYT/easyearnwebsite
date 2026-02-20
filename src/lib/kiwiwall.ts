const DEFAULT_KIWIWALL_TOKEN = "f1juoiwduopq2xu5xl14l53ocjyx0ddt";

type KiwiWallUrlInput = {
  userId: string;
};

export function buildKiwiWallOfferwallUrl({ userId }: KiwiWallUrlInput): string | null {
  const token = process.env.KIWIWALL_WALL_TOKEN?.trim() || DEFAULT_KIWIWALL_TOKEN;
  if (!token) {
    return null;
  }

  const safeUserId = encodeURIComponent(userId.trim());
  if (!safeUserId) {
    return null;
  }

  return `https://www.kiwiwall.com/wall/${token}/${safeUserId}`;
}

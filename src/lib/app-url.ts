const DEFAULT_APP_URL = "https://ezearn.org";

function ensureProtocol(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const requested = raw && raw.length > 0 ? raw : DEFAULT_APP_URL;

  try {
    const normalized = ensureProtocol(requested).replace(/\/+$/, "");
    const host = new URL(normalized).hostname.toLowerCase();

    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return DEFAULT_APP_URL;
    }

    return normalized;
  } catch {
    return DEFAULT_APP_URL;
  }
}

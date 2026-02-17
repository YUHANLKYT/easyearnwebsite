import { createHash } from "node:crypto";

type BuildCpxOfferwallUrlInput = {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  subId1?: string;
  subId2?: string;
};

export function buildCpxOfferwallUrl(input: BuildCpxOfferwallUrlInput): string | null {
  const appId = process.env.CPX_APP_ID?.trim() || "31489";
  const appSecret = process.env.CPX_APP_SECRET?.trim() || process.env.CPX_POSTBACK_SECRET?.trim();
  const userId = input.userId.trim();

  if (!appId || !userId) {
    return null;
  }

  const url = new URL("https://offers.cpx-research.com/index.php");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("ext_user_id", userId);
  url.searchParams.set("username", (input.userName ?? "").trim());
  url.searchParams.set("email", (input.userEmail ?? "").trim());
  url.searchParams.set("subid_1", (input.subId1 ?? "").trim());
  url.searchParams.set("subid_2", (input.subId2 ?? "").trim());

  if (appSecret) {
    const secureHash = createHash("md5").update(`${userId}-${appSecret}`).digest("hex");
    url.searchParams.set("secure_hash", secureHash);
  }

  return url.toString();
}

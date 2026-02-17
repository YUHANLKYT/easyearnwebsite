import { prisma } from "@/lib/prisma";

const REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferralCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * REFERRAL_CHARS.length);
    code += REFERRAL_CHARS[index];
  }
  return code;
}

export async function createUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateReferralCode();
    const existing = await prisma.user.findUnique({
      where: {
        referralCode: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${generateReferralCode(6)}${Date.now().toString().slice(-4)}`;
}

export function maskDisplayName(name: string): string {
  if (name.length <= 1) {
    return `${name}***`;
  }
  return `${name[0]}${"*".repeat(Math.min(4, name.length - 1))}`;
}

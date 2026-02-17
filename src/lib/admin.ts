import { compare, hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createUniqueReferralCode } from "@/lib/users";

const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME?.trim() || "Easy Earn Admin";
const DEFAULT_ADMIN_REFERRAL_CODE = (process.env.DEFAULT_ADMIN_REFERRAL_CODE ?? "EASY").trim().toUpperCase() || "EASY";

function getAdminBootstrapCredentials() {
  if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
    return null;
  }

  return {
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
  };
}

async function resolveAdminReferralCode(adminId?: string, fallbackCode?: string) {
  const owner = await prisma.user.findUnique({
    where: {
      referralCode: DEFAULT_ADMIN_REFERRAL_CODE,
    },
    select: {
      id: true,
    },
  });

  if (!owner || owner.id === adminId) {
    return DEFAULT_ADMIN_REFERRAL_CODE;
  }

  if (fallbackCode) {
    return fallbackCode;
  }

  return createUniqueReferralCode();
}

export async function ensureDefaultAdminAccount() {
  const bootstrapCredentials = getAdminBootstrapCredentials();
  if (!bootstrapCredentials) {
    return;
  }

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: bootstrapCredentials.email,
    },
  });

  const passwordHash = await hash(bootstrapCredentials.password, 12);
  const adminReferralCode = await resolveAdminReferralCode(existingAdmin?.id, existingAdmin?.referralCode);

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: DEFAULT_ADMIN_NAME,
        email: bootstrapCredentials.email,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        referralCode: adminReferralCode,
      },
    });
    return;
  }

  const passwordMatches = await compare(bootstrapCredentials.password, existingAdmin.passwordHash);
  await prisma.user.update({
    where: {
      id: existingAdmin.id,
    },
    data: {
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: passwordMatches ? undefined : passwordHash,
      name: existingAdmin.name || DEFAULT_ADMIN_NAME,
      referralCode: adminReferralCode,
    },
  });
}

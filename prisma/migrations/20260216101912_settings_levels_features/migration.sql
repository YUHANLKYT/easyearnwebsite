-- AlterTable
ALTER TABLE "Redemption" ADD COLUMN "deliveryCode" TEXT;
ALTER TABLE "Redemption" ADD COLUMN "notificationSentAt" DATETIME;

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LevelCaseOpen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "levelAtOpen" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LevelCaseOpen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "rewardCents" INTEGER NOT NULL,
    "maxUses" INTEGER NOT NULL,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "audience" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoCode_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromoCodeRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoCodeRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromoCodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "anonymousMode" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" DATETIME,
    "moderationNote" TEXT,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarnedCents" INTEGER NOT NULL DEFAULT 0,
    "totalWithdrawnCents" INTEGER NOT NULL DEFAULT 0,
    "lastWithdrawalAt" DATETIME,
    "wheelLastSpunAt" DATETIME,
    "levelCaseKeys" INTEGER NOT NULL DEFAULT 0,
    "levelRewardsClaimed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("balanceCents", "createdAt", "email", "id", "lastWithdrawalAt", "lifetimeEarnedCents", "moderationNote", "name", "passwordHash", "referralCode", "referredById", "role", "status", "totalWithdrawnCents", "updatedAt", "wheelLastSpunAt") SELECT "balanceCents", "createdAt", "email", "id", "lastWithdrawalAt", "lifetimeEarnedCents", "moderationNote", "name", "passwordHash", "referralCode", "referredById", "role", "status", "totalWithdrawnCents", "updatedAt", "wheelLastSpunAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");
CREATE INDEX "User_lastWithdrawalAt_idx" ON "User"("lastWithdrawalAt");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_role_idx" ON "User"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_createdAt_idx" ON "EmailVerificationToken"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LevelCaseOpen_userId_createdAt_idx" ON "LevelCaseOpen"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_creatorId_createdAt_idx" ON "PromoCode"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "PromoCode_isActive_createdAt_idx" ON "PromoCode"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "PromoCodeRedemption_userId_createdAt_idx" ON "PromoCodeRedemption"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCodeRedemption_promoCodeId_userId_key" ON "PromoCodeRedemption"("promoCodeId", "userId");

/*
  Warnings:

  - Added the required column `payoutCents` to the `TaskClaim` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "handledById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Complaint_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Redemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "processedById" TEXT,
    "processedAt" DATETIME,
    "referralBonusCents" INTEGER NOT NULL DEFAULT 0,
    "referralBonusPaidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Redemption_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Redemption" ("amountCents", "createdAt", "id", "method", "status", "userId") SELECT "amountCents", "createdAt", "id", "method", "status", "userId" FROM "Redemption";
DROP TABLE "Redemption";
ALTER TABLE "new_Redemption" RENAME TO "Redemption";
CREATE INDEX "Redemption_userId_createdAt_idx" ON "Redemption"("userId", "createdAt");
CREATE INDEX "Redemption_status_createdAt_idx" ON "Redemption"("status", "createdAt");
CREATE TABLE "new_TaskClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "payoutCents" INTEGER NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskClaim" ("claimedAt", "id", "taskKey", "userId") SELECT "claimedAt", "id", "taskKey", "userId" FROM "TaskClaim";
DROP TABLE "TaskClaim";
ALTER TABLE "new_TaskClaim" RENAME TO "TaskClaim";
CREATE INDEX "TaskClaim_userId_taskKey_claimedAt_idx" ON "TaskClaim"("userId", "taskKey", "claimedAt");
CREATE INDEX "TaskClaim_claimedAt_idx" ON "TaskClaim"("claimedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "moderationNote" TEXT,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarnedCents" INTEGER NOT NULL DEFAULT 0,
    "totalWithdrawnCents" INTEGER NOT NULL DEFAULT 0,
    "lastWithdrawalAt" DATETIME,
    "wheelLastSpunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("balanceCents", "createdAt", "email", "id", "lastWithdrawalAt", "lifetimeEarnedCents", "name", "passwordHash", "referralCode", "referredById", "totalWithdrawnCents", "updatedAt", "wheelLastSpunAt") SELECT "balanceCents", "createdAt", "email", "id", "lastWithdrawalAt", "lifetimeEarnedCents", "name", "passwordHash", "referralCode", "referredById", "totalWithdrawnCents", "updatedAt", "wheelLastSpunAt" FROM "User";
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
CREATE INDEX "Complaint_status_createdAt_idx" ON "Complaint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_userId_createdAt_idx" ON "Complaint"("userId", "createdAt");

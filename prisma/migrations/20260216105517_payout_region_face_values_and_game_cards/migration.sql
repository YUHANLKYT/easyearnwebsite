-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Redemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "payoutRegion" TEXT NOT NULL DEFAULT 'US',
    "payoutCurrency" TEXT NOT NULL DEFAULT 'USD',
    "faceValueCents" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "processedById" TEXT,
    "processedAt" DATETIME,
    "referralBonusCents" INTEGER NOT NULL DEFAULT 0,
    "referralBonusPaidAt" DATETIME,
    "deliveryCode" TEXT,
    "notificationSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Redemption_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Redemption" ("amountCents", "createdAt", "deliveryCode", "id", "method", "note", "notificationSentAt", "processedAt", "processedById", "referralBonusCents", "referralBonusPaidAt", "status", "userId") SELECT "amountCents", "createdAt", "deliveryCode", "id", "method", "note", "notificationSentAt", "processedAt", "processedById", "referralBonusCents", "referralBonusPaidAt", "status", "userId" FROM "Redemption";
DROP TABLE "Redemption";
ALTER TABLE "new_Redemption" RENAME TO "Redemption";
CREATE INDEX "Redemption_userId_createdAt_idx" ON "Redemption"("userId", "createdAt");
CREATE INDEX "Redemption_status_createdAt_idx" ON "Redemption"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

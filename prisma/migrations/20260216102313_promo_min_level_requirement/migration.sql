-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromoCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "rewardCents" INTEGER NOT NULL,
    "maxUses" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 0,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "audience" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoCode_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PromoCode" ("audience", "code", "createdAt", "creatorId", "id", "isActive", "maxUses", "rewardCents", "usesCount") SELECT "audience", "code", "createdAt", "creatorId", "id", "isActive", "maxUses", "rewardCents", "usesCount" FROM "PromoCode";
DROP TABLE "PromoCode";
ALTER TABLE "new_PromoCode" RENAME TO "PromoCode";
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_creatorId_createdAt_idx" ON "PromoCode"("creatorId", "createdAt");
CREATE INDEX "PromoCode_isActive_createdAt_idx" ON "PromoCode"("isActive", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

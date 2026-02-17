ALTER TABLE "TaskClaim" ADD COLUMN "offerwallName" TEXT NOT NULL DEFAULT 'Easy Earn Internal';
ALTER TABLE "TaskClaim" ADD COLUMN "offerId" TEXT;
ALTER TABLE "TaskClaim" ADD COLUMN "offerTitle" TEXT;
ALTER TABLE "TaskClaim" ADD COLUMN "pendingUntil" DATETIME;
ALTER TABLE "TaskClaim" ADD COLUMN "creditedAt" DATETIME;

UPDATE "TaskClaim"
SET "creditedAt" = "claimedAt"
WHERE "creditedAt" IS NULL;

CREATE INDEX "TaskClaim_userId_pendingUntil_creditedAt_idx" ON "TaskClaim"("userId", "pendingUntil", "creditedAt");
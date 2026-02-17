CREATE TABLE "StreakCaseOpen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "streakStartDay" DATETIME NOT NULL,
    "streakDaysAtOpen" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreakCaseOpen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StreakCaseOpen_userId_tier_streakStartDay_key" ON "StreakCaseOpen"("userId", "tier", "streakStartDay");
CREATE INDEX "StreakCaseOpen_userId_createdAt_idx" ON "StreakCaseOpen"("userId", "createdAt");
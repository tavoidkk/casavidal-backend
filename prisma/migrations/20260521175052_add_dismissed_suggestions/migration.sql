-- CreateTable
CREATE TABLE "dismissed_suggestions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dismissed_suggestions_userId_clientId_ruleKey_key" ON "dismissed_suggestions"("userId", "clientId", "ruleKey");

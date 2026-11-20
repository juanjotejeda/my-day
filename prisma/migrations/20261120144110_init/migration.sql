-- CreateEnum
CREATE TYPE "SourceProvider" AS ENUM ('google');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('calendar', 'appointment', 'reminder', 'task');

-- CreateEnum
CREATE TYPE "ItemRank" AS ENUM ('must', 'should', 'could', 'protected', 'later');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('work', 'personal');

-- CreateEnum
CREATE TYPE "Effort" AS ENUM ('deep', 'light', 'meeting', 'errand', 'break');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('planned', 'done', 'moved', 'dropped');

-- CreateEnum
CREATE TYPE "ItemSource" AS ENUM ('calendar', 'gmail', 'manual', 'voice');

-- CreateEnum
CREATE TYPE "CandidateState" AS ENUM ('open', 'accepted', 'dismissed');

-- CreateEnum
CREATE TYPE "CorrectionKind" AS ENUM ('tomorrow', 'important', 'more_time', 'category', 'done', 'moved_time', 'dismissed');

-- CreateEnum
CREATE TYPE "RuleOrigin" AS ENUM ('stated', 'learned', 'suggested');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "userId" TEXT NOT NULL,
    "rhythm" JSONB NOT NULL DEFAULT '{}',
    "work" JSONB NOT NULL DEFAULT '{}',
    "focus" JSONB NOT NULL DEFAULT '{}',
    "priorities" JSONB NOT NULL DEFAULT '{}',
    "protectedTime" JSONB NOT NULL DEFAULT '[]',
    "notifications" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "settings_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SourceProvider" NOT NULL DEFAULT 'google',
    "encryptedRefreshToken" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "calendarIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "calendarSyncToken" TEXT,
    "gmailHistoryId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "fixed" BOOLEAN NOT NULL DEFAULT false,
    "flexibleDuration" INTEGER,
    "rank" "ItemRank" NOT NULL DEFAULT 'should',
    "important" BOOLEAN NOT NULL DEFAULT false,
    "category" "Category" NOT NULL DEFAULT 'work',
    "effort" "Effort",
    "status" "ItemStatus" NOT NULL DEFAULT 'planned',
    "day" DATE,
    "sourceKind" "ItemSource" NOT NULL,
    "sourceRef" TEXT,
    "sourceUrl" TEXT,
    "sourceQuote" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "quote" TEXT,
    "extracted" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "state" "CandidateState" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT,
    "kind" "CorrectionKind" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "origin" "RuleOrigin" NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "doneCount" INTEGER NOT NULL DEFAULT 0,
    "plannedCount" INTEGER NOT NULL DEFAULT 0,
    "feeling" TEXT,
    "planRight" TEXT,
    "carryOver" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "day_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "settings_history_userId_createdAt_idx" ON "settings_history"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sources_userId_kind_key" ON "sources"("userId", "kind");

-- CreateIndex
CREATE INDEX "items_userId_day_idx" ON "items"("userId", "day");

-- CreateIndex
CREATE INDEX "items_userId_status_idx" ON "items"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "items_userId_sourceRef_key" ON "items"("userId", "sourceRef");

-- CreateIndex
CREATE INDEX "candidates_userId_state_idx" ON "candidates"("userId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_userId_gmailMessageId_key" ON "candidates"("userId", "gmailMessageId");

-- CreateIndex
CREATE INDEX "corrections_userId_kind_createdAt_idx" ON "corrections"("userId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "rules_userId_active_idx" ON "rules"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "day_reviews_userId_date_key" ON "day_reviews"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "events_log_kind_createdAt_idx" ON "events_log"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_history" ADD CONSTRAINT "settings_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_reviews" ADD CONSTRAINT "day_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_log" ADD CONSTRAINT "events_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

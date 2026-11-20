-- AlterTable
ALTER TABLE "items" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "items_userId_archivedAt_idx" ON "items"("userId", "archivedAt");

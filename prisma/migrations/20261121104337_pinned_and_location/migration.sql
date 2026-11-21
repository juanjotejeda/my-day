-- AlterTable
ALTER TABLE "items" ADD COLUMN     "location" TEXT,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

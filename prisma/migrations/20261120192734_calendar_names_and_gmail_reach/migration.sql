-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "calendars" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "gmailIncludeSent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gmailLookbackDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "gmailScope" TEXT NOT NULL DEFAULT 'inbox';

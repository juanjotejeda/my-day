/*
  Warnings:

  - The `calendarSyncToken` column on the `sources` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "sources" DROP COLUMN "calendarSyncToken",
ADD COLUMN     "calendarSyncToken" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "createdHere" BOOLEAN NOT NULL DEFAULT false;

-- Items typed or spoken into My Day were always its own.
UPDATE "items" SET "createdHere" = true WHERE "sourceKind" IN ('manual', 'voice');

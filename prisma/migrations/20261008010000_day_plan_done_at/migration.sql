-- AlterTable
ALTER TABLE "DayPlan" ADD COLUMN "doneAt" TIMESTAMP(3);

-- To-dos ticked off before this column existed: their last edit is the best guess.
UPDATE "DayPlan" SET "doneAt" = "updatedAt" WHERE "isDone" = true;

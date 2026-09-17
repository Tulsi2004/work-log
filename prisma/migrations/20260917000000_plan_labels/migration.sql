-- A plan's label becomes free text, so a label the user defined can sit
-- alongside the built-in seven. Existing rows keep their value verbatim
-- ('URGENT' stays 'URGENT'), so no to-do changes colour.
ALTER TABLE "DayPlan" ALTER COLUMN "label" DROP DEFAULT;
ALTER TABLE "DayPlan" ALTER COLUMN "label" SET DATA TYPE TEXT USING "label"::TEXT;
ALTER TABLE "DayPlan" ALTER COLUMN "label" SET DEFAULT 'GENERAL';

-- The enum is no longer referenced, and its name is wanted for the table below.
DROP TYPE "PlanLabel";

-- CreateTable
CREATE TABLE "PlanLabel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colour" TEXT NOT NULL DEFAULT 'slate',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanLabel_userId_idx" ON "PlanLabel"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanLabel_userId_name_key" ON "PlanLabel"("userId", "name");

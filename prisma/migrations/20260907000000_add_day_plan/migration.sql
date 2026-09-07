-- CreateEnum
CREATE TYPE "PlanLabel" AS ENUM ('URGENT', 'CLIENT', 'FOLLOW_UP', 'MEETING', 'IDEA', 'PERSONAL', 'GENERAL');

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employmentId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "label" "PlanLabel" NOT NULL DEFAULT 'GENERAL',
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayPlan_userId_idx" ON "DayPlan"("userId");

-- CreateIndex
CREATE INDEX "DayPlan_userId_date_idx" ON "DayPlan"("userId", "date");

-- CreateIndex
CREATE INDEX "DayPlan_employmentId_idx" ON "DayPlan"("employmentId");

-- AddForeignKey
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

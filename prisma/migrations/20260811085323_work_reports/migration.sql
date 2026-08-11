/*
  Warnings:

  - You are about to drop the `Note` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('LUMPSUM', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('OFFICE', 'WORK_FROM_HOME', 'HALF_DAY');

-- DropTable
DROP TABLE "Note";

-- DropEnum
DROP TYPE "AttendanceStatus";

-- DropEnum
DROP TYPE "CompanyStatus";

-- DropEnum
DROP TYPE "NoteCategory";

-- DropEnum
DROP TYPE "ProjectStatus";

-- DropEnum
DROP TYPE "WorkLogStatus";

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paymentType" "PaymentType" NOT NULL DEFAULT 'MONTHLY',
    "amount" DOUBLE PRECISION,
    "since" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeFrom" TEXT,
    "timeTo" TEXT,
    "dayType" "DayType" NOT NULL DEFAULT 'OFFICE',
    "isLeave" BOOLEAN NOT NULL DEFAULT false,
    "leaveFrom" TIMESTAMP(3),
    "leaveTo" TIMESTAMP(3),
    "hasMeeting" BOOLEAN NOT NULL DEFAULT false,
    "leaveReason" TEXT,
    "hasNoTask" BOOLEAN NOT NULL DEFAULT false,
    "noTaskNote" TEXT,
    "tasks" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_userId_idx" ON "Company"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_name_key" ON "Company"("userId", "name");

-- CreateIndex
CREATE INDEX "WorkReport_userId_idx" ON "WorkReport"("userId");

-- CreateIndex
CREATE INDEX "WorkReport_userId_date_idx" ON "WorkReport"("userId", "date");

-- CreateIndex
CREATE INDEX "WorkReport_companyId_idx" ON "WorkReport"("companyId");

-- AddForeignKey
ALTER TABLE "WorkReport" ADD CONSTRAINT "WorkReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

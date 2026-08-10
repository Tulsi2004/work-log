-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WORK_FROM_HOME');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "WorkLogStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'PENDING');

-- AlterTable
ALTER TABLE "Note"
  ALTER COLUMN "content" DROP NOT NULL,
  ADD COLUMN "attendanceStatus" "AttendanceStatus",
  ADD COLUMN "checkIn" TEXT,
  ADD COLUMN "checkOut" TEXT,
  ADD COLUMN "breakIn" TEXT,
  ADD COLUMN "breakOut" TEXT,
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "companyStatus" "CompanyStatus",
  ADD COLUMN "projectName" TEXT,
  ADD COLUMN "projectStatus" "ProjectStatus",
  ADD COLUMN "projectStartDate" TIMESTAMP(3),
  ADD COLUMN "projectEndDate" TIMESTAMP(3),
  ADD COLUMN "workLogDate" TIMESTAMP(3),
  ADD COLUMN "hoursWorked" DOUBLE PRECISION,
  ADD COLUMN "workLogStatus" "WorkLogStatus";

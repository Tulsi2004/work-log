-- AlterEnum
ALTER TYPE "CustomFieldEntity" ADD VALUE 'SALARY_ENTRY';

-- CreateTable
CREATE TABLE "SalaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employmentId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" TEXT,
    "note" TEXT,
    "spends" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryEntry_userId_idx" ON "SalaryEntry"("userId");

-- CreateIndex
CREATE INDEX "SalaryEntry_userId_date_idx" ON "SalaryEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "SalaryEntry_employmentId_idx" ON "SalaryEntry"("employmentId");

-- AddForeignKey
ALTER TABLE "SalaryEntry" ADD CONSTRAINT "SalaryEntry_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

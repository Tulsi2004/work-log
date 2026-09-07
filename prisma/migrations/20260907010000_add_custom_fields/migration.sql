-- CreateEnum
CREATE TYPE "CustomFieldEntity" AS ENUM ('WORK_REPORT', 'EMPLOYMENT', 'DAY_PLAN');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'CHECKBOX', 'SELECT');

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entity" "CustomFieldEntity" NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomField_userId_entity_idx" ON "CustomField"("userId", "entity");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_userId_entity_name_key" ON "CustomField"("userId", "entity", "name");

-- CreateIndex
CREATE INDEX "CustomFieldValue_userId_idx" ON "CustomFieldValue"("userId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_recordId_idx" ON "CustomFieldValue"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_fieldId_recordId_key" ON "CustomFieldValue"("fieldId", "recordId");

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

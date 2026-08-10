-- CreateEnum
CREATE TYPE "NoteCategory" AS ENUM ('GENERAL', 'WORK', 'PERSONAL', 'IDEAS', 'REFERENCE');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN "category" "NoteCategory" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "Note_userId_category_idx" ON "Note"("userId", "category");

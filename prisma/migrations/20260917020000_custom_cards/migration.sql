-- CreateTable
CREATE TABLE "CustomCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "measure" TEXT NOT NULL,
    "field" TEXT,
    "period" TEXT NOT NULL DEFAULT 'ALL',
    "filters" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomCard_userId_idx" ON "CustomCard"("userId");

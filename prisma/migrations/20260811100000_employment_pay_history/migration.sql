-- CreateTable
CREATE TABLE "Employment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "designation" TEXT,
    "since" TIMESTAMP(3),
    "until" TIMESTAMP(3),
    "paymentType" "PaymentType" NOT NULL DEFAULT 'MONTHLY',
    "payHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employment_companyId_idx" ON "Employment"("companyId");

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MigrateData: carry each Company's existing payment/date fields into a new Employment stint
INSERT INTO "Employment" ("id", "companyId", "designation", "since", "until", "paymentType", "payHistory", "createdAt", "updatedAt")
SELECT
    substr(md5(random()::text || clock_timestamp()::text || "Company"."id"), 1, 25),
    "Company"."id",
    NULL,
    "Company"."since",
    "Company"."until",
    "Company"."paymentType",
    CASE
        WHEN "Company"."amount" IS NOT NULL THEN
            jsonb_build_array(jsonb_build_object(
                'amount', "Company"."amount",
                'effectiveFrom', to_char(COALESCE("Company"."since", "Company"."createdAt"), 'YYYY-MM-DD')
            ))
        ELSE '[]'::jsonb
    END,
    now(),
    now()
FROM "Company";

-- AlterTable: Company no longer carries payment/date fields directly, an Employment stint does
ALTER TABLE "Company" DROP COLUMN "amount",
DROP COLUMN "paymentType",
DROP COLUMN "since",
DROP COLUMN "until";

-- AlterTable: WorkReport now belongs to a specific Employment stint rather than the Company directly
ALTER TABLE "WorkReport" DROP CONSTRAINT "WorkReport_companyId_fkey";
DROP INDEX "WorkReport_companyId_idx";
ALTER TABLE "WorkReport" RENAME COLUMN "companyId" TO "employmentId";

-- CreateIndex
CREATE INDEX "WorkReport_employmentId_idx" ON "WorkReport"("employmentId");

-- AddForeignKey
ALTER TABLE "WorkReport" ADD CONSTRAINT "WorkReport_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

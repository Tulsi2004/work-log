import { notFound } from "next/navigation";
import { SalaryPanel } from "@/components/salary/salary-panel";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export default async function SalaryPage() {
  // Only there for someone who switched it on for a company of theirs.
  const userId = await requireUserId();
  const enabled = await prisma.company.count({ where: { userId, salaryCalculator: true } });
  if (!enabled) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Salary calculator</h1>
        <p className="text-sm text-muted-foreground">
          Pick a job and a month to work out what lands in hand.
        </p>
      </div>
      <SalaryPanel />
    </div>
  );
}

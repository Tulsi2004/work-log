import { SalaryPanel } from "@/components/salary/salary-panel";

export default function SalaryPage() {
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

import { MoneyPanel } from "@/components/money/money-panel";

export default function MoneyPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Money</h1>
        <p className="text-sm text-muted-foreground">
          Salary and any other money you received, and where each rupee of it went.
        </p>
      </div>
      <MoneyPanel />
    </div>
  );
}

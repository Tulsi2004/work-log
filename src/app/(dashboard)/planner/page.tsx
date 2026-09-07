import { DayPlanPanel } from "@/components/day-plans/day-plan-panel";

export default function PlannerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Planner</h1>
        <p className="text-sm text-muted-foreground">
          Colour-coded to-dos for each day, grouped by date.
        </p>
      </div>
      <DayPlanPanel />
    </div>
  );
}

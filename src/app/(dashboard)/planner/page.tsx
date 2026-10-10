import { DayPlanPanel } from "@/components/day-plans/day-plan-panel";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // What the navbar search was looking for; the panel opens already filtered to it,
  // and remounts (key) when a new search lands on the page it is already on.
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Planner</h1>
        <p className="text-sm text-muted-foreground">
          Labelled to-dos for each day, grouped by date.
        </p>
      </div>
      <DayPlanPanel key={search} initialSearch={search} />
    </div>
  );
}

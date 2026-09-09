"use client";

import { useDayPlanSummary } from "@/hooks/use-day-plan-summary";

// A count when something is due today (or overdue), otherwise a bare dot when
// something is only coming up — enough of a nudge to open the planner without
// implying it needs doing now. Nothing at all when everything is ticked off.
export function PlannerBadge() {
  const { data } = useDayPlanSummary();
  const due = data?.due ?? 0;
  const upcoming = data?.upcoming ?? 0;

  if (due > 0) {
    return (
      <span
        aria-label={`${due} to-do${due === 1 ? "" : "s"} due`}
        className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-4xl bg-rose-500 px-1 text-[10px] leading-none font-semibold text-white tabular-nums"
      >
        {due > 99 ? "99+" : due}
      </span>
    );
  }

  if (upcoming > 0) {
    return (
      <span
        aria-label={`${upcoming} to-do${upcoming === 1 ? "" : "s"} coming up`}
        className="ml-0.5 inline-block size-1.5 shrink-0 rounded-full bg-amber-500"
      />
    );
  }

  return null;
}

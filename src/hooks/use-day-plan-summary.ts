"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export interface DayPlanSummary {
  // Open to-dos for today, plus anything still open from an earlier day.
  due: number;
  // Open to-dos falling inside the next few days.
  upcoming: number;
}

// Counts behind the planner's navbar badge. Keyed under "day-plans" so every
// existing to-do mutation invalidates it and the badge clears itself.
export function useDayPlanSummary() {
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["day-plans", "summary", today],
    queryFn: async () => {
      const res = await fetch(`/api/day-plans/summary?today=${today}`);
      if (!res.ok) throw new Error("Failed to load to-do counts");
      return (await res.json()) as DayPlanSummary;
    },
    staleTime: 60_000,
    // Keeps the badge honest across a day boundary on a tab left open.
    refetchInterval: 5 * 60_000,
  });
}

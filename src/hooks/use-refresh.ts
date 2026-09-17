"use client";

import { useQueryClient } from "@tanstack/react-query";

/**
 * What a change reaches. Cards and tables read the same records through
 * different queries — a company's name rides along on every work report row,
 * its dates feed the experience cards — so a mutation that refreshes only the
 * thing it edited leaves a stale number somewhere else on screen.
 *
 * Listing it once here rather than at each call site is what keeps them in step.
 */
const REFRESHES: Record<string, string[]> = {
  // Name, dates and pay history all show up on the work report and money rows
  // (each names its company) and behind every dashboard card.
  employment: ["employments", "work-reports", "salary-entries", "dashboard-stats"],
  // Day counts, meetings and leave are all counted server-side.
  workReport: ["work-reports", "dashboard-stats", "suggestions"],
  salaryEntry: ["salary-entries", "dashboard-stats", "suggestions"],
  // The navbar badge's summary is keyed under "day-plans", so it comes along;
  // the open/done counts on the dashboard do not.
  dayPlan: ["day-plans", "dashboard-stats"],
  planLabel: ["plan-labels", "day-plans"],
  // A field added or removed changes the columns of every table that offers it.
  customField: ["custom-fields", "work-reports", "day-plans", "employments", "salary-entries"],
};

export type Change = keyof typeof REFRESHES;

/**
 * Refetch everything downstream of what just changed.
 * `refresh("employment")` after saving a company, and so on.
 */
export function useRefresh() {
  const queryClient = useQueryClient();

  return (...changes: Change[]) => {
    const keys = new Set(changes.flatMap((change) => REFRESHES[change] ?? []));
    for (const key of keys) {
      // Prefix match, so ["work-reports", filters] and ["day-plans", "summary", date] go too.
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

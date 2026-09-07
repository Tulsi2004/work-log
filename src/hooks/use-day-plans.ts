"use client";

import { useQuery } from "@tanstack/react-query";
import { buildSearchParams } from "@/lib/query-params";
import { toCustomFilterParams } from "@/lib/custom-field-params";
import type { DayPlanWithEmployment } from "@/types";

export interface DayPlanFilters {
  search: string;
  label?: string;
  employmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: "open" | "done";
  customFilters?: Record<string, string>;
}

export function useDayPlans(filters: DayPlanFilters) {
  return useQuery({
    queryKey: ["day-plans", filters],
    queryFn: async () => {
      const { customFilters, ...rest } = filters;
      const sp = buildSearchParams({ ...rest, ...toCustomFilterParams(customFilters ?? {}) });
      const res = await fetch(`/api/day-plans?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load to-dos");
      return (await res.json()) as { data: DayPlanWithEmployment[] };
    },
    placeholderData: (prev) => prev,
  });
}

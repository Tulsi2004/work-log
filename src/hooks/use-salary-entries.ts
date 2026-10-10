"use client";

import { useQuery } from "@tanstack/react-query";
import { buildSearchParams } from "@/lib/query-params";
import { toCustomFilterParams } from "@/lib/custom-field-params";
import type { SalaryTotals } from "@/app/api/salary-entries/route";
import type { SalaryEntryWithEmployment } from "@/types";

export interface SalaryEntryFilters {
  search: string;
  employmentId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  customFilters?: Record<string, string>;
}

// No filters at all — the same query key the money page starts on, so a card or
// tab that needs everything shares that fetch rather than making its own.
export const ALL_ENTRIES: SalaryEntryFilters = { search: "", customFilters: {} };

export function useSalaryEntries(filters: SalaryEntryFilters) {
  return useQuery({
    queryKey: ["salary-entries", filters],
    queryFn: async () => {
      const { customFilters, ...rest } = filters;
      const sp = buildSearchParams({ ...rest, ...toCustomFilterParams(customFilters ?? {}) });
      const res = await fetch(`/api/salary-entries?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load money entries");
      return (await res.json()) as { data: SalaryEntryWithEmployment[]; totals: SalaryTotals };
    },
    placeholderData: (prev) => prev,
  });
}

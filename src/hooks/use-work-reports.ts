"use client";

import { useQuery } from "@tanstack/react-query";
import { buildSearchParams } from "@/lib/query-params";
import type { WorkReportWithEmployment } from "@/types";

export interface WorkReportFilters {
  search: string;
  employmentId?: string;
  dayType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useWorkReports(filters: WorkReportFilters) {
  return useQuery({
    queryKey: ["work-reports", filters],
    queryFn: async () => {
      const sp = buildSearchParams({ ...filters });
      const res = await fetch(`/api/work-reports?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load work reports");
      return (await res.json()) as { data: WorkReportWithEmployment[] };
    },
    placeholderData: (prev) => prev,
  });
}

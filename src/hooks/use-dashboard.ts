"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/actions/dashboard-actions";

export function useDashboardStats(employmentId?: string) {
  return useQuery({
    queryKey: ["dashboard-stats", employmentId],
    queryFn: () => getDashboardStats(employmentId),
  });
}

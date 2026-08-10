"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/actions/dashboard-actions";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });
}

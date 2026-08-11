"use client";

import { useQuery } from "@tanstack/react-query";
import { listEmployments } from "@/actions/work-report-actions";

export function useEmployments() {
  return useQuery({
    queryKey: ["employments"],
    queryFn: () => listEmployments(),
  });
}

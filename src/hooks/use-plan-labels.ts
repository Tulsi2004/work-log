"use client";

import { useQuery } from "@tanstack/react-query";
import { listPlanLabels } from "@/actions/plan-label-actions";
import { planLabelLooks } from "@/lib/plan-labels";

/** The labels the user added, on top of the built-in seven. */
export function usePlanLabels() {
  return useQuery({
    queryKey: ["plan-labels"],
    queryFn: () => listPlanLabels(),
  });
}

/** Everything the picker and the filters offer, built-ins first. */
export function usePlanLabelLooks() {
  const { data: custom } = usePlanLabels();
  return planLabelLooks(custom ?? []);
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { listCustomCards } from "@/actions/custom-card-actions";

/** The cards the user built, each with the number it currently shows. */
export function useCustomCards() {
  return useQuery({
    queryKey: ["custom-cards"],
    queryFn: () => listCustomCards(),
  });
}

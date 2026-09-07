"use client";

import { useQuery } from "@tanstack/react-query";
import { getPreference } from "@/actions/preference-actions";

export function usePreference(key: string) {
  return useQuery({
    queryKey: ["preference", key],
    queryFn: () => getPreference(key),
  });
}

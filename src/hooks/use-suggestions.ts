"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePreference } from "@/hooks/use-preference";
import { setPreference } from "@/actions/preference-actions";

/**
 * Values the user struck out of one suggestion list ("spend", "projectName"…).
 * Suggestions are read off past records, so removing one cannot touch those
 * records — it is remembered here instead, and the list leaves it out. Keyed by
 * list rather than by company, so a name hidden once is gone everywhere.
 * ponytail: hidden stays hidden even if the value is typed again later; clear
 * the preference row to bring one back, or add an "unhide" list if it's missed.
 */
export function useHiddenSuggestions(list?: string) {
  const queryClient = useQueryClient();
  const key = `hiddenSuggestions.${list}`;
  const { data } = usePreference(key, !!list);
  const hidden = Array.isArray(data) ? data.filter((v): v is string => typeof v === "string") : [];

  const save = async (next: string[], previous: string[]) => {
    // Shown at once; put back if the save fails.
    queryClient.setQueryData(["preference", key], next);
    try {
      await setPreference(key, next);
    } catch {
      queryClient.setQueryData(["preference", key], previous);
      toast.error("Could not update suggestions");
    }
  };

  const hide = (value: string) => {
    const before = hidden;
    save([...before, value], before);
    toast.success(`Removed “${value}” from suggestions`, {
      action: { label: "Undo", onClick: () => save(before, [...before, value]) },
    });
  };

  return { hidden, hide };
}

/**
 * Past values for one free-text field, so the same thing is not retyped — or
 * spelled two different ways — every time. Every suggestions endpoint answers
 * with `{ data: string[] }`, so the path is the whole query.
 */
export function useSuggestions(path: string, enabled = true) {
  return useQuery({
    queryKey: ["suggestions", path],
    queryFn: async () => {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Failed to load suggestions");
      return (await res.json()).data as string[];
    },
    enabled,
  });
}

// Unique, sorted, blank-free — what every suggestion list needs, whether the
// values came from an endpoint or from records already in the cache.
export function toSuggestions(values: (string | null | undefined)[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) unique.add(trimmed);
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
}

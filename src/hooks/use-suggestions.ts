"use client";

import { useQuery } from "@tanstack/react-query";

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

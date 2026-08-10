"use client";

import { useQuery } from "@tanstack/react-query";
import { buildSearchParams } from "@/lib/query-params";
import type { Note } from "@/types";

export function useNotes(search: string, category?: string) {
  return useQuery({
    queryKey: ["notes", search, category],
    queryFn: async () => {
      const sp = buildSearchParams({ search, category });
      const res = await fetch(`/api/notes?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load notes");
      return (await res.json()) as { data: Note[] };
    },
    placeholderData: (prev) => prev,
  });
}

"use client";

import { useEffect } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { dateKey, fromUserTz, SCHEDULE_CHUNK_DAYS } from "@/lib/calendar/dates";
import { api, reviveOccurrence } from "@/lib/calendar/client";
import type { Occurrence } from "@/lib/calendar/recurrence";
import type { Jsonify } from "@/lib/calendar/types";
import { useUserTz } from "./use-calendar-settings";

/** A span of local copies, end exclusive. */
export type Range = { start: Date; end: Date };

const occurrencesKey = (tz: string, r: Range) => [
  "cal-occurrences",
  tz,
  fromUserTz(r.start, tz).toISOString(),
  fromUserTz(r.end, tz).toISOString(),
];

async function fetchRange(tz: string, r: Range) {
  const qs = new URLSearchParams({
    start: fromUserTz(r.start, tz).toISOString(),
    end: fromUserTz(r.end, tz).toISOString(),
    tz,
  });
  const list = await api<Jsonify<Occurrence>[]>(`/api/calendar/events?${qs}`);
  return list.map(reviveOccurrence);
}

/** Occurrences in a range; once loaded, the neighbouring periods are prefetched so ‹ › feel instant. */
export function useOccurrences(range: Range, neighbours: Range[] = []) {
  const tz = useUserTz();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: occurrencesKey(tz, range),
    queryFn: () => fetchRange(tz, range),
    placeholderData: keepPreviousData,
  });

  const neighbourKey = neighbours.map((r) => `${+r.start}-${+r.end}`).join();
  const loaded = query.isSuccess && !query.isPlaceholderData;
  useEffect(() => {
    if (!loaded) return;
    for (const r of neighbours) qc.prefetchQuery({ queryKey: occurrencesKey(tz, r), queryFn: () => fetchRange(tz, r) });
    // `neighbours` is a fresh array each render; neighbourKey stands in for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, neighbourKey, tz, qc]);

  return query;
}

/** Schedule view: 60-day pages from the anchor, loaded as the list scrolls. */
export function useSchedule(anchor: Date) {
  const tz = useUserTz();
  return useInfiniteQuery({
    queryKey: ["cal-schedule", tz, dateKey(anchor)],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const start = addDays(anchor, pageParam * SCHEDULE_CHUNK_DAYS);
      return fetchRange(tz, { start, end: addDays(start, SCHEDULE_CHUNK_DAYS) });
    },
    // Two years ahead at most.
    getNextPageParam: (_last, pages) => (pages.length < 12 ? pages.length : undefined),
  });
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { addDaysToKey, dateKey, formatTime, formatTimeRange, getVisibleRange, navigate, parseDateKey } from "@/lib/calendar/dates";
import { api, reviveOccurrence } from "@/lib/calendar/client";
import type { Occurrence } from "@/lib/calendar/recurrence";
import type { Jsonify } from "@/lib/calendar/types";
import { anchorFor, openDetail, useUI } from "@/lib/calendar/ui-store";
import { buildItems, toCalItem, useCalendarItems, type CalItem } from "@/hooks/calendar/use-calendar-items";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { useCalendars, useSettings } from "@/hooks/calendar/use-calendar-settings";
import { useSchedule } from "@/hooks/calendar/use-occurrences";
import { useNow } from "@/hooks/calendar/use-now";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthGrid } from "./mini-calendar";
import { itemsOnDay } from "./month-view";

/** Twelve mini months; a dot marks days with events, and a click lists that day's items. */
export function YearView({ date }: { date: Date }) {
  const { weekStartsOn, showWeekends } = useSettings();
  const year = date.getFullYear();
  const range = useMemo(
    () => getVisibleRange("year", date, weekStartsOn, showWeekends),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, weekStartsOn, showWeekends],
  );
  const neighbours = useMemo(
    () => [-1, 1].map((d) => getVisibleRange("year", navigate("year", range.start, d as 1 | -1), weekStartsOn, showWeekends)),
    [range, weekStartsOn, showWeekends],
  );
  const { items } = useCalendarItems(range, neighbours);
  const today = useNow();
  const dots = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) for (let k = it.startKey; k < it.endKey; k = addDaysToKey(k, 1)) set.add(k);
    return set;
  }, [items]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="grid gap-x-8 gap-y-6 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, m) => addMonths(startOfYear(range.start), m)).map((month) => (
          <div key={month.getMonth()} className="mx-auto w-full max-w-64">
            <h2 className="mb-1 pl-2 text-sm font-medium">{format(month, "MMMM")}</h2>
            <MonthGrid
              month={month}
              weekStartsOn={weekStartsOn}
              today={today}
              dots={dots}
              onPick={(d, el) =>
                useUI.getState().set({ popover: { kind: "day", anchor: anchorFor(el), date: d, items: itemsOnDay(items, dateKey(d)) } })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Items grouped by day; only days with items are listed. */
function AgendaList({ items, eachDay, fromKey }: { items: CalItem[]; eachDay: boolean; fromKey?: string }) {
  const { timeFormat: fmt } = useSettings();
  const { go } = useCalendarRoute();
  const todayKey = dateKey(useNow());
  const groups = useMemo(() => {
    const byDay = new Map<string, CalItem[]>();
    for (const it of items) {
      const keys: string[] = [];
      if (eachDay) for (let k = it.startKey; k < it.endKey; k = addDaysToKey(k, 1)) keys.push(k);
      else keys.push(it.startKey);
      for (const k of keys) if (!fromKey || k >= fromKey) byDay.set(k, [...(byDay.get(k) ?? []), it]);
    }
    return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [items, eachDay, fromKey]);

  const timeText = (it: CalItem, k: string) => {
    if (it.isAllDay) return "All day";
    const first = k === it.startKey;
    const last = addDaysToKey(k, 1) === it.endKey;
    if (first && last) return formatTimeRange(it.fStart, it.fEnd, fmt);
    if (first) return `${formatTime(it.fStart, fmt)} –`;
    if (last) return `– ${formatTime(it.fEnd, fmt)}`;
    return "All day";
  };

  return (
    <div role="list">
      {groups.map(([k, list]) => {
        const day = parseDateKey(k);
        return (
          <div key={k} role="listitem" className="flex gap-2 border-b px-2 py-2 sm:gap-4 sm:px-4">
            <div className="flex w-24 shrink-0 items-start gap-2 sm:w-28">
              <button
                type="button"
                aria-label={format(day, "EEEE, MMMM d")}
                onClick={() => go("day", day)}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full text-xl tabular-nums",
                  k === todayKey ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {day.getDate()}
              </button>
              <span className={cn("mt-2.5 text-[11px] uppercase", k === todayKey ? "text-primary" : "text-muted-foreground")}>
                {format(day, "MMM, EEE")}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              {list.map((it) => (
                <button
                  key={it.occurrenceId}
                  type="button"
                  onClick={(e) => openDetail(it, e.currentTarget.querySelector("[data-title]") ?? e.currentTarget)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted sm:gap-4"
                >
                  <span className="w-28 shrink-0 text-xs sm:w-36 sm:text-sm">{timeText(it, k)}</span>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.displayColor }} />
                  <span data-title className="truncate font-medium">
                    {it.title}
                  </span>
                  {it.location && <span className="truncate text-muted-foreground max-md:hidden">{it.location}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Upcoming days with events, loaded 60 days at a time as the list scrolls. */
export function ScheduleView({ date }: { date: Date }) {
  const { timezone: tz } = useSettings();
  const calendars = useCalendars();
  const query = useSchedule(date);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const items = useMemo(() => buildItems(query.data?.pages.flat() ?? [], calendars, tz), [query.data, calendars, tz]);
  const fromKey = dateKey(date);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    io.observe(sentinel.current!);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const empty = !query.isLoading && !items.some((it) => it.endKey > fromKey);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <AgendaList items={items} eachDay fromKey={fromKey} />
      {empty && !hasNextPage && <p className="p-8 text-center text-muted-foreground">Nothing planned. Enjoy!</p>}
      <div ref={sentinel} className="p-4 text-center text-sm text-muted-foreground">
        {(query.isLoading || isFetchingNextPage) && "Loading more…"}
      </div>
    </div>
  );
}

/** /calendar/search?q= — each matching event once, on its first day; hidden calendars still match. */
export function SearchResults() {
  const q = useSearchParams().get("q")?.trim() ?? "";
  const { timezone: tz } = useSettings();
  const calendars = useCalendars();
  const query = useQuery({
    queryKey: ["cal-search", q, tz],
    queryFn: () =>
      api<Jsonify<Occurrence>[]>(`/api/calendar/search?${new URLSearchParams({ q, tz })}`).then((l) => l.map(reviveOccurrence)),
    enabled: !!q,
  });
  const items = useMemo(() => {
    const cals = new Map(calendars.map((c) => [c.id, c]));
    return (query.data ?? []).map((o) => toCalItem(o, tz, cals.get(o.calendarId)));
  }, [query.data, calendars, tz]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <h2 className="px-4 pt-4 pb-2 text-lg">{q ? <>Search results for “{q}”</> : "Type in the search box above"}</h2>
      {query.isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : q && !items.length ? (
        <p className="px-4 text-muted-foreground">No results found.</p>
      ) : (
        <AgendaList items={items} eachDay={false} />
      )}
    </div>
  );
}

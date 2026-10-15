"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { addDaysToKey, dateKey, formatTime, parseDateKey, toUserTz, type TimeFormatKey } from "@/lib/calendar/dates";
import { textColorFor } from "@/lib/calendar/colors";
import type { Occurrence } from "@/lib/calendar/recurrence";
import type { CalendarDTO } from "@/lib/calendar/types";
import { useOccurrences, type Range } from "./use-occurrences";
import { useCalendars, useSettings } from "./use-calendar-settings";

const DAY_MS = 86_400_000;

/** An occurrence ready to render: local copies in the user's tz plus layout keys. */
export type CalItem = Occurrence & {
  fStart: Date;
  fEnd: Date;
  startKey: string; // first day (date key)
  endKey: string; // day after the last day, exclusive
  inAllDayRow: boolean; // all-day, or timed and 24h or longer (those go in the all-day row)
  displayColor: string;
  readOnly: boolean;
};

export function toCalItem(o: Occurrence, tz: string, cal: CalendarDTO | undefined): CalItem {
  const fStart = o.isAllDay ? parseDateKey(o.startDate!) : toUserTz(o.start, tz);
  const fEnd = o.isAllDay ? parseDateKey(o.endDate!) : toUserTz(o.end, tz);
  const endsAtMidnight = fEnd.getHours() === 0 && fEnd.getMinutes() === 0;
  return {
    ...o,
    fStart,
    fEnd,
    startKey: dateKey(fStart),
    endKey: o.isAllDay ? o.endDate! : endsAtMidnight ? dateKey(fEnd) : addDaysToKey(dateKey(fEnd), 1),
    inAllDayRow: o.isAllDay || o.end.getTime() - o.start.getTime() >= DAY_MS,
    displayColor: o.color ?? cal?.color ?? "#039be5",
    // Optimistic "temp" events can't be edited until the server returns their id.
    readOnly: (cal?.isReadOnly ?? true) || o.eventId === "temp",
  };
}

/** "Team sync, 3:00pm to 4:00pm, Wednesday October 14" */
export function itemAriaLabel(item: CalItem, fmt: TimeFormatKey) {
  const when = item.isAllDay ? "All day" : `${formatTime(item.fStart, fmt, true)} to ${formatTime(item.fEnd, fmt, true)}`;
  return `${item.title}, ${when}, ${format(item.fStart, "EEEE MMMM d")}`;
}

export const isVisibleCalendar = (c: CalendarDTO | undefined) => !!c && c.isVisible && !c.isHidden;

/** Visible calendars' occurrences as render items, de-duplicated and sorted. */
export function buildItems(occurrences: Occurrence[], calendars: CalendarDTO[], tz: string): CalItem[] {
  const cals = new Map(calendars.map((c) => [c.id, c]));
  const out: CalItem[] = [];
  const seen = new Set<string>();
  for (const occ of occurrences) {
    // Infinite schedule pages overlap at their edges.
    if (seen.has(occ.occurrenceId)) continue;
    seen.add(occ.occurrenceId);
    const cal = cals.get(occ.calendarId);
    if (isVisibleCalendar(cal)) out.push(toCalItem(occ, tz, cal));
  }
  return out.sort((a, b) => a.fStart.getTime() - b.fStart.getTime() || b.fEnd.getTime() - a.fEnd.getTime());
}

/** Everything to draw for a range (local copies, end exclusive). */
export function useCalendarItems(range: Range, neighbours: Range[] = []) {
  const { timezone: tz } = useSettings();
  const calendars = useCalendars();
  const query = useOccurrences(range, neighbours);
  const items = useMemo(() => buildItems(query.data ?? [], calendars, tz), [query.data, calendars, tz]);
  return { items, isLoading: query.isFetching };
}

export const itemStyle = (item: CalItem): React.CSSProperties => ({
  backgroundColor: item.displayColor,
  color: textColorFor(item.displayColor),
});

import { dateKey, fromUserTz } from "./dates";

export type Prefill = {
  /** Local copies; for all-day the end is exclusive. */
  start: Date;
  end: Date;
  isAllDay: boolean;
  title?: string;
  calendarId?: string;
  description?: string | null;
  location?: string | null;
  rrule?: string | null;
  color?: string | null;
  /** The event's own time zone, when it differs from the user's. */
  tz?: string;
};

/** The full editor, prefilled. Timed events travel as ISO instants, all-day ones as date keys. */
export function newEventHref(p: Prefill, userTz: string) {
  const qs = new URLSearchParams({
    start: p.isAllDay ? dateKey(p.start) : fromUserTz(p.start, userTz).toISOString(),
    end: p.isAllDay ? dateKey(p.end) : fromUserTz(p.end, userTz).toISOString(),
    allDay: p.isAllDay ? "1" : "0",
  });
  for (const k of ["title", "calendarId", "description", "location", "rrule", "color", "tz"] as const)
    if (p[k]) qs.set(k, p[k]);
  return `/calendar/event/new?${qs}`;
}

export const editHref = (occurrenceId: string) => `/calendar/event/${encodeURIComponent(occurrenceId)}/edit`;

/** The date in a /calendar/{view}/{y}/{m}/{d} URL as a local midnight, or null if it isn't a real date. */
export function routeDate(y?: string, m?: string, d?: string) {
  if (!y || !m || !d || !/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d)) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.getMonth() === Number(m) - 1 && date.getDate() === Number(d) ? date : null;
}

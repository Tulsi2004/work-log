import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isWeekend,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  type Locale,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/*
 * Timezone strategy (see README): instants travel as UTC. In the browser every
 * instant is converted ONCE with toUserTz() into a "local copy" whose local fields
 * (getHours, getDate...) equal the wall-clock time in the user's timezone. All
 * grid math and date-fns formatting run on those copies; fromUserTz() converts
 * back before saving. All-day dates are "YYYY-MM-DD" keys and never converted.
 */

export const HOUR_HEIGHT = 48;
export const SCHEDULE_CHUNK_DAYS = 60;

export const VIEWS = ["day", "week", "month", "year", "schedule", "4days"] as const;
export type ViewKey = (typeof VIEWS)[number];
export type WeekStart = 0 | 1 | 6;
export type TimeFormatKey = "H12" | "H24";

export const VIEW_LABELS: Record<ViewKey, { label: string; key: string }> = {
  day: { label: "Day", key: "D" },
  week: { label: "Week", key: "W" },
  month: { label: "Month", key: "M" },
  year: { label: "Year", key: "Y" },
  schedule: { label: "Schedule", key: "A" },
  "4days": { label: "4 days", key: "X" },
};

const PRISMA_VIEW: Record<ViewKey, string> = {
  day: "DAY",
  week: "WEEK",
  month: "MONTH",
  year: "YEAR",
  schedule: "SCHEDULE",
  "4days": "FOUR_DAYS",
};
export const viewToPrisma = (v: ViewKey) => PRISMA_VIEW[v];
export const viewFromPrisma = (v: string): ViewKey =>
  (Object.keys(PRISMA_VIEW) as ViewKey[]).find((k) => PRISMA_VIEW[k] === v) ?? "week";
export const isViewKey = (v: string): v is ViewKey => (VIEWS as readonly string[]).includes(v);

/** URL for a view at a date (local copy): /calendar/week/2026/10/14 */
export const calendarPath = (view: ViewKey, date: Date) => `/calendar/${view}/${format(date, "yyyy/MM/dd")}`;

export type VisibleRange = { start: Date; end: Date; days: Date[] };

function daysBetween(start: Date, end: Date): Date[] {
  const n = differenceInCalendarDays(end, start);
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}

/** Visible range for a view; `end` is exclusive. Month = the full 5×7 or 6×7 grid. */
export function getVisibleRange(
  view: ViewKey,
  anchor: Date,
  weekStartsOn: WeekStart,
  showWeekends: boolean,
): VisibleRange {
  const a = startOfDay(anchor);
  let start: Date;
  let end: Date;
  switch (view) {
    case "day":
      start = a;
      end = addDays(a, 1);
      break;
    case "4days":
      if (!showWeekends) {
        // Four weekdays starting at the anchor.
        const days: Date[] = [];
        for (let d = a; days.length < 4; d = addDays(d, 1)) if (!isWeekend(d)) days.push(d);
        return { start: days[0], end: addDays(days[3], 1), days };
      }
      start = a;
      end = addDays(a, 4);
      break;
    case "week":
      start = startOfWeek(a, { weekStartsOn });
      end = addDays(start, 7);
      break;
    case "month": {
      start = startOfWeek(startOfMonth(a), { weekStartsOn });
      const weeks = Math.ceil((differenceInCalendarDays(endOfMonth(a), start) + 1) / 7);
      end = addDays(start, weeks * 7);
      break;
    }
    case "year":
      start = startOfYear(a);
      end = addYears(start, 1);
      break;
    case "schedule":
      start = a;
      end = addDays(a, SCHEDULE_CHUNK_DAYS);
      break;
  }
  let days = daysBetween(start, end);
  if (!showWeekends && (view === "week" || view === "month")) days = days.filter((d) => !isWeekend(d));
  return { start, end, days };
}

export function navigate(view: ViewKey, anchor: Date, direction: 1 | -1): Date {
  switch (view) {
    case "day":
      return addDays(anchor, direction);
    case "4days":
      return addDays(anchor, 4 * direction);
    case "week":
    case "schedule":
      return addWeeks(anchor, direction);
    case "month":
      return addMonths(anchor, direction);
    case "year":
      return addYears(anchor, direction);
  }
}

export function formatRangeTitle(view: ViewKey, range: VisibleRange, locale?: Locale): string {
  const opts = { locale };
  if (view === "day") return format(range.start, "MMMM d, yyyy", opts);
  if (view === "year") return format(range.start, "yyyy", opts);
  // Month grid starts in the previous month; day 15 of the grid is always inside the month.
  if (view === "month") return format(addDays(range.start, 15), "MMMM yyyy", opts);
  if (view === "schedule") return format(range.start, "MMMM yyyy", opts);
  const first = range.days[0];
  const last = range.days[range.days.length - 1];
  if (first.getFullYear() !== last.getFullYear())
    return `${format(first, "MMM yyyy", opts)} – ${format(last, "MMM yyyy", opts)}`;
  if (first.getMonth() !== last.getMonth())
    return `${format(first, "MMM", opts)} – ${format(last, "MMM yyyy", opts)}`;
  return format(first, "MMMM yyyy", opts);
}

/** UTC instant -> local copy carrying the user's wall-clock fields. */
export const toUserTz = (date: Date, tz: string): Date => toZonedTime(date, tz);
/** Local copy (wall-clock fields in `tz`) -> UTC instant. */
export const fromUserTz = (local: Date, tz: string): Date => fromZonedTime(local, tz);

/** The next round half hour after `now` (local copy): 9:10 -> 9:30, 9:40 -> 10:00. */
export function nextHalfHour(now: Date): Date {
  const d = new Date(now);
  d.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

/** Round (or floor) a local date's minutes to a step. */
export function snapToMinutes(date: Date, step = 15, mode: "round" | "floor" = "round"): Date {
  const d = new Date(date);
  const mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  const snapped = (mode === "floor" ? Math.floor : Math.round)(mins / step) * step;
  d.setHours(0, snapped, 0, 0);
  return d;
}

export function gmtOffsetLabel(tz: string, at: Date = new Date()): string {
  const off = formatInTimeZone(at, tz, "xxx");
  return off === "+00:00" ? "GMT+00" : `GMT${off}`;
}

/** "(GMT+05:30) India Standard Time" */
export function timeZoneLabel(tz: string, at: Date = new Date()): string {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? tz;
  return `(${gmtOffsetLabel(tz, at)}) ${name}`;
}

export const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// ---------- date keys ("YYYY-MM-DD") ----------
export const dateKey = (d: Date) => format(d, "yyyy-MM-dd");
/** Parses a date key to a local midnight. */
export const parseDateKey = (key: string) => parseISO(key);
export const addDaysToKey = (key: string, n: number) => dateKey(addDays(parseISO(key), n));
/** The user's calendar date of a UTC instant. */
export const dateKeyInTz = (instant: Date, tz: string) => formatInTimeZone(instant, tz, "yyyy-MM-dd");

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

// ---------- time formatting (inputs are local copies) ----------
function hourPart(d: Date, fmt: TimeFormatKey, keepZeroMinutes: boolean) {
  if (fmt === "H24") return format(d, "HH:mm");
  return d.getMinutes() === 0 && !keepZeroMinutes ? format(d, "h") : format(d, "h:mm");
}
const meridiem = (d: Date) => (d.getHours() < 12 ? "am" : "pm");

/** "3pm", "3:30pm" / "15:00"; `long` keeps ":00" like Google's popovers. */
export function formatTime(d: Date, fmt: TimeFormatKey, long = false): string {
  return fmt === "H24" ? format(d, "HH:mm") : hourPart(d, fmt, long) + meridiem(d);
}

/** "3 – 4pm", "11am – 12:30pm", "3:00 – 4:00pm" (long), "15:00 – 16:00". */
export function formatTimeRange(start: Date, end: Date, fmt: TimeFormatKey, long = false): string {
  if (fmt === "H24") return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
  const sameMeridiem = meridiem(start) === meridiem(end);
  const left = hourPart(start, fmt, long) + (sameMeridiem ? "" : meridiem(start));
  return `${left} – ${formatTime(end, fmt, long)}`;
}

/**
 * Google's date/time line: "Wednesday, October 14 · 3:00 – 4:00pm", "October 17 – 19, 2026".
 * Inputs are local copies; for all-day `end` is exclusive.
 */
export function whenText(start: Date, end: Date, isAllDay: boolean, fmt: TimeFormatKey): string {
  if (isAllDay) {
    const last = addDays(end, -1);
    if (differenceInCalendarDays(last, start) <= 0) return format(start, "EEEE, MMMM d");
    if (start.getFullYear() !== last.getFullYear())
      return `${format(start, "MMMM d, yyyy")} – ${format(last, "MMMM d, yyyy")}`;
    if (start.getMonth() !== last.getMonth()) return `${format(start, "MMMM d")} – ${format(last, "MMMM d, yyyy")}`;
    return `${format(start, "MMMM d")} – ${format(last, "d, yyyy")}`;
  }
  if (differenceInCalendarDays(end, start) === 0 || (differenceInCalendarDays(end, start) === 1 && minutesOfDay(end) === 0))
    return `${format(start, "EEEE, MMMM d")} · ${formatTimeRange(start, end, fmt, true)}`;
  return `${format(start, "MMMM d, yyyy")}, ${formatTime(start, fmt, true)} – ${format(end, "MMMM d, yyyy")}, ${formatTime(end, fmt, true)}`;
}

/** Hour label for the time gutter: "1 AM" / "13:00". */
export const hourLabel = (hour: number, fmt: TimeFormatKey) =>
  fmt === "H24"
    ? `${String(hour).padStart(2, "0")}:00`
    : `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "AM" : "PM"}`;

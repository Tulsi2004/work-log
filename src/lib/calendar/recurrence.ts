import { format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { RRule } from "rrule";
import { addDaysToKey } from "./dates";

/*
 * RRULEs are expanded in "wall time": the series start is encoded as a fake-UTC Date
 * whose UTC fields are the wall-clock time in the event's own timezone. rrule then does
 * pure calendar arithmetic (no DST), and every result is converted back to a real
 * instant with fromWall(). So "every Monday 9:00" stays 9:00 local across DST changes.
 * UNTIL values in stored rules are wall times too.
 */

export const FAR_FUTURE = new Date("9999-12-31T00:00:00.000Z");
const DAY_MS = 86_400_000;

export const toWall = (instant: Date, tz: string) =>
  new Date(formatInTimeZone(instant, tz, "yyyy-MM-dd'T'HH:mm:ss") + "Z");
export const fromWall = (wall: Date, tz: string) => fromZonedTime(wall.toISOString().slice(0, 19), tz);
const keyToWall = (key: string) => new Date(`${key}T00:00:00.000Z`);
const wallToKey = (wall: Date) => wall.toISOString().slice(0, 10);
export const keyDiffDays = (from: string, to: string) =>
  Math.round((keyToWall(to).getTime() - keyToWall(from).getTime()) / DAY_MS);

export type EventLike = {
  id: string;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  color: string | null;
  isAllDay: boolean;
  startAt: Date | null;
  endAt: Date | null;
  timezone: string;
  startDate: string | null;
  endDate: string | null;
  rrule: string | null;
};

export type ExceptionLike = {
  eventId: string;
  originalStart: Date;
  isCancelled: boolean;
  title: string | null;
  description: string | null;
  location: string | null;
  color: string | null;
  startAt: Date | null;
  endAt: Date | null;
  startDate: string | null;
  endDate: string | null;
};

export type Occurrence = {
  occurrenceId: string; // `${eventId}:${originalStartISO}` or eventId for non-recurring
  eventId: string;
  originalStart: Date | null;
  isRecurring: boolean;
  title: string;
  description: string | null;
  location: string | null;
  color: string | null; // null = calendar colour
  calendarId: string;
  isAllDay: boolean;
  start: Date; // for all-day: local midnights in user tz
  end: Date;
  startDate: string | null; // all-day only, end exclusive
  endDate: string | null;
  rrule: string | null;
  timezone: string;
  /** Set by the server range query: whether the event blocks time. */
  busy?: boolean;
  /** Set when the event belongs to someone else and the user is one of its guests. */
  invitation?: Invitation | null;
};

export type GuestStatus = "accepted" | "declined" | "tentative" | "needsAction";
export type Invitation = { status: GuestStatus; organizer: string; organizerEmail: string };

/** The series rule with its dtstart in wall time. */
export function seriesRule(e: Pick<EventLike, "isAllDay" | "startAt" | "startDate" | "timezone" | "rrule">) {
  const dtstart = e.isAllDay ? keyToWall(e.startDate!) : toWall(e.startAt!, e.timezone);
  return new RRule({ ...RRule.parseString(e.rrule!), dtstart });
}

const durationMs = (e: EventLike) => e.endAt!.getTime() - e.startAt!.getTime();

export function makeOccurrence(
  e: EventLike,
  originalStart: Date | null,
  ex: ExceptionLike | undefined,
  userTz: string,
): Occurrence {
  let start: Date, end: Date;
  let startDate: string | null = null;
  let endDate: string | null = null;
  if (e.isAllDay) {
    const span = keyDiffDays(e.startDate!, e.endDate!);
    const base = originalStart ? wallToKey(originalStart) : e.startDate!;
    startDate = ex?.startDate ?? base;
    endDate = ex?.endDate ?? addDaysToKey(startDate, span);
    start = fromZonedTime(`${startDate}T00:00:00`, userTz);
    end = fromZonedTime(`${endDate}T00:00:00`, userTz);
  } else {
    const base = originalStart ?? e.startAt!;
    start = ex?.startAt ?? base;
    end = ex?.endAt ?? new Date(start.getTime() + durationMs(e));
  }
  return {
    occurrenceId: originalStart ? `${e.id}:${originalStart.toISOString()}` : e.id,
    eventId: e.id,
    originalStart,
    isRecurring: !!e.rrule,
    title: ex?.title ?? e.title,
    description: ex?.description ?? e.description,
    location: ex?.location ?? e.location,
    color: ex?.color ?? e.color,
    calendarId: e.calendarId,
    isAllDay: e.isAllDay,
    start,
    end,
    startDate,
    endDate,
    rrule: e.rrule,
    timezone: e.timezone,
  };
}

/** Expands events into occurrences overlapping [rangeStart, rangeEnd). */
export function expandEvents(
  events: EventLike[],
  exceptions: ExceptionLike[],
  rangeStart: Date,
  rangeEnd: Date,
  userTz: string,
): Occurrence[] {
  const startKey = formatInTimeZone(rangeStart, userTz, "yyyy-MM-dd");
  const endKey = addDaysToKey(formatInTimeZone(new Date(rangeEnd.getTime() - 1), userTz, "yyyy-MM-dd"), 1);
  const inRange = (o: Occurrence) =>
    o.isAllDay ? o.startDate! < endKey && o.endDate! > startKey : o.start < rangeEnd && o.end > rangeStart;

  const exByEvent = new Map<string, ExceptionLike[]>();
  for (const ex of exceptions) exByEvent.set(ex.eventId, [...(exByEvent.get(ex.eventId) ?? []), ex]);

  const out: Occurrence[] = [];
  for (const e of events) {
    if (!e.rrule) {
      const occ = makeOccurrence(e, null, undefined, userTz);
      if (inRange(occ)) out.push(occ);
      continue;
    }
    const rule = seriesRule(e);
    const exs = exByEvent.get(e.id) ?? [];
    const exMap = new Map(exs.map((x) => [x.originalStart.getTime(), x]));
    const toOriginal = (w: Date) => (e.isAllDay ? w : fromWall(w, e.timezone));
    // Generous wall-time window; exact filtering happens in inRange().
    const walls = e.isAllDay
      ? rule.between(
          new Date(keyToWall(startKey).getTime() - keyDiffDays(e.startDate!, e.endDate!) * DAY_MS),
          keyToWall(endKey),
          true,
        )
      : rule.between(
          new Date(toWall(new Date(rangeStart.getTime() - durationMs(e)), e.timezone).getTime() - DAY_MS),
          new Date(toWall(rangeEnd, e.timezone).getTime() + DAY_MS),
          true,
        );

    const seen = new Set<number>();
    for (const w of walls) {
      const originalStart = toOriginal(w);
      seen.add(originalStart.getTime());
      const ex = exMap.get(originalStart.getTime());
      if (ex?.isCancelled) continue;
      const occ = makeOccurrence(e, originalStart, ex, userTz);
      if (inRange(occ)) out.push(occ);
    }
    // Exceptions moved INTO the range from an original start outside it.
    for (const ex of exs) {
      if (ex.isCancelled || seen.has(ex.originalStart.getTime()) || !isSeriesOccurrence(e, ex.originalStart)) continue;
      const occ = makeOccurrence(e, ex.originalStart, ex, userTz);
      if (inRange(occ)) out.push(occ);
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());
}

/** The first occurrence of an event (the event itself if it doesn't repeat). */
export function firstOccurrence(e: EventLike, userTz: string): Occurrence | null {
  if (!e.rrule) return makeOccurrence(e, null, undefined, userTz);
  const rule = seriesRule(e);
  const w = rule.after(rule.origOptions.dtstart!, true);
  return w ? makeOccurrence(e, e.isAllDay ? w : fromWall(w, e.timezone), undefined, userTz) : null;
}

/** True if `originalStart` is a generated occurrence of the series. */
export function isSeriesOccurrence(e: EventLike, originalStart: Date): boolean {
  const wall = e.isAllDay ? originalStart : toWall(originalStart, e.timezone);
  return seriesRule(e).between(new Date(wall.getTime() - 1000), new Date(wall.getTime() + 1000), true).length > 0;
}

/** Latest instant any occurrence can end, for range queries (FAR_FUTURE if unbounded). */
export function computeRecurrenceEndAt(e: Omit<EventLike, "id" | "calendarId" | "title" | "description" | "location" | "color">) {
  if (!e.rrule) return null;
  const rule = seriesRule(e);
  let lastWall: Date | undefined;
  if (rule.origOptions.until) lastWall = rule.origOptions.until;
  else if (rule.origOptions.count) lastWall = rule.all().at(-1) ?? rule.origOptions.dtstart!;
  else return FAR_FUTURE;
  if (e.isAllDay) {
    // +2 days of slack covers every user timezone offset.
    return new Date(lastWall.getTime() + (keyDiffDays(e.startDate!, e.endDate!) + 2) * DAY_MS);
  }
  return new Date(fromWall(lastWall, e.timezone).getTime() + (e.endAt!.getTime() - e.startAt!.getTime()));
}

// ---------- RRULE string helpers ----------

const CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR"];
const NTH: Record<string, string> = { "1": "first", "2": "second", "3": "third", "4": "fourth", "5": "fifth", "-1": "last" };
export const WEEKDAY_CODES = CODES;

export function rruleParts(rrule: string): Record<string, string> {
  return Object.fromEntries(
    rrule
      .replace(/^RRULE:/, "")
      .split(";")
      .filter(Boolean)
      .map((p) => p.split("=") as [string, string]),
  );
}
const joinParts = (parts: Record<string, string | undefined>) =>
  Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join(";");

export const formatUntil = (wall: Date) => wall.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
const untilToKey = (until: string) => `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`;
const nthOf = (d: Date) => (Math.ceil(d.getDate() / 7) === 5 ? -1 : Math.ceil(d.getDate() / 7));
const sortDays = (days: string[]) => [...days].sort((a, b) => CODES.indexOf(a as never) - CODES.indexOf(b as never));

/** Human text for a rule. `start` is the series start as a local copy. */
export function describeRRule(rrule: string | null, start: Date): string {
  if (!rrule) return "Does not repeat";
  const p = rruleParts(rrule);
  const interval = Number(p.INTERVAL ?? 1);
  const byDay = p.BYDAY ? p.BYDAY.split(",") : [];
  let text: string;
  switch (p.FREQ) {
    case "DAILY":
      text = interval === 1 ? "Daily" : `Every ${interval} days`;
      break;
    case "WEEKLY": {
      const days = sortDays(byDay.length ? byDay : [CODES[start.getDay()]]);
      if (interval === 1 && days.join() === WEEKDAYS.join()) {
        text = "Every weekday (Monday to Friday)";
        break;
      }
      const names = days.map((c) => DAY_NAMES[CODES.indexOf(c as never)]).join(", ");
      text = interval === 1 ? `Weekly on ${names}` : `Every ${interval} weeks on ${names}`;
      break;
    }
    case "MONTHLY": {
      const m = byDay[0]?.match(/^([+-]?\d+)([A-Z]{2})$/);
      const on = m
        ? `on the ${NTH[String(Number(m[1]))]} ${DAY_NAMES[CODES.indexOf(m[2] as never)]}`
        : `on day ${p.BYMONTHDAY ?? start.getDate()}`;
      text = interval === 1 ? `Monthly ${on}` : `Every ${interval} months ${on}`;
      break;
    }
    case "YEARLY": {
      const on = format(start, "MMMM d");
      text = interval === 1 ? `Annually on ${on}` : `Every ${interval} years on ${on}`;
      break;
    }
    default:
      text = "Custom";
  }
  if (p.COUNT) text += `, ${p.COUNT} times`;
  else if (p.UNTIL) text += `, until ${format(parseISO(untilToKey(p.UNTIL)), "MMM d, yyyy")}`;
  return text;
}

/** Google's "Does not repeat" dropdown presets for a start date (local copy). */
export function recurrencePresets(start: Date): { value: string | null; label: string }[] {
  const code = CODES[start.getDay()];
  return [
    null,
    "FREQ=DAILY",
    `FREQ=WEEKLY;BYDAY=${code}`,
    `FREQ=MONTHLY;BYDAY=${nthOf(start)}${code}`,
    "FREQ=YEARLY",
    "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  ].map((value) => ({ value, label: describeRRule(value, start) }));
}

export type RecurrenceForm = {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  byDay: string[];
  monthlyMode: "day" | "nth";
  ends: "never" | "on" | "after";
  until: string; // yyyy-MM-dd
  count: number;
};

export function rruleToForm(rrule: string | null, start: Date, defaultUntil: string): RecurrenceForm {
  const p = rrule ? rruleParts(rrule) : { FREQ: "WEEKLY" };
  return {
    freq: (p.FREQ as RecurrenceForm["freq"]) ?? "WEEKLY",
    interval: Number(p.INTERVAL ?? 1),
    byDay: p.BYDAY && p.FREQ === "WEEKLY" ? p.BYDAY.split(",") : [CODES[start.getDay()]],
    monthlyMode: p.FREQ === "MONTHLY" && p.BYDAY ? "nth" : "day",
    ends: p.COUNT ? "after" : p.UNTIL ? "on" : "never",
    until: p.UNTIL ? untilToKey(p.UNTIL) : defaultUntil,
    count: Number(p.COUNT ?? 13),
  };
}

export function formToRRule(f: RecurrenceForm, start: Date): string {
  const code = CODES[start.getDay()];
  return joinParts({
    FREQ: f.freq,
    INTERVAL: f.interval > 1 ? String(f.interval) : undefined,
    BYDAY:
      f.freq === "WEEKLY"
        ? sortDays(f.byDay.length ? f.byDay : [code]).join(",")
        : f.freq === "MONTHLY" && f.monthlyMode === "nth"
          ? `${nthOf(start)}${code}`
          : undefined,
    BYMONTHDAY: f.freq === "MONTHLY" && f.monthlyMode === "day" ? String(start.getDate()) : undefined,
    UNTIL: f.ends === "on" ? formatUntil(new Date(`${f.until}T23:59:59.000Z`)) : undefined,
    COUNT: f.ends === "after" ? String(Math.max(1, f.count)) : undefined,
  });
}

/**
 * Splits a series at an occurrence ("this and following"). `before` ends just before
 * the split; `after` keeps the remaining COUNT if the rule had one.
 */
export function splitRRule(rrule: string, dtstartWall: Date, splitWall: Date) {
  const { COUNT, ...rest } = rruleParts(rrule);
  delete rest.UNTIL;
  const before = joinParts({ ...rest, UNTIL: formatUntil(new Date(splitWall.getTime() - 1000)) });
  let after = rrule;
  if (COUNT) {
    const rule = new RRule({ ...RRule.parseString(rrule), dtstart: dtstartWall });
    const used = rule.between(dtstartWall, splitWall, true).filter((d) => d < splitWall).length;
    after = joinParts({ ...rest, COUNT: String(Math.max(1, Number(COUNT) - used)) });
  }
  return { before, after };
}

/** Shifts BYDAY / BYMONTHDAY when a whole series moves by whole days. */
export function shiftRRuleDays(rrule: string, dayDelta: number): string {
  if (!dayDelta) return rrule;
  const p = rruleParts(rrule);
  if (p.BYDAY)
    p.BYDAY = p.BYDAY.split(",")
      .map((t) => {
        const m = t.match(/^([+-]?\d*)([A-Z]{2})$/);
        if (!m) return t;
        const i = (((CODES.indexOf(m[2] as never) + dayDelta) % 7) + 7) % 7;
        return m[1] + CODES[i];
      })
      .join(",");
  if (p.BYMONTHDAY)
    p.BYMONTHDAY = p.BYMONTHDAY.split(",")
      .map((d) => String(Math.min(31, Math.max(1, Number(d) + dayDelta))))
      .join(",");
  return joinParts(p);
}

export const isValidRRule = (rrule: string) => {
  try {
    const p = rruleParts(rrule);
    if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(p.FREQ)) return false;
    // Bounded so computeRecurrenceEndAt's rule.all() stays cheap.
    if (Number(p.COUNT ?? 1) > 1000 || Number(p.INTERVAL ?? 1) > 999) return false;
    new RRule({ ...RRule.parseString(rrule), dtstart: new Date() });
    return true;
  } catch {
    return false;
  }
};

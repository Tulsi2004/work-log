import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError, ownedCalendar } from "./api";
import { addDaysToKey, dateKeyInTz } from "./dates";
import {
  computeRecurrenceEndAt,
  expandEvents,
  firstOccurrence,
  fromWall,
  isSeriesOccurrence,
  keyDiffDays,
  makeOccurrence,
  seriesRule,
  shiftRRuleDays,
  splitRRule,
  toWall,
} from "./recurrence";
import { timingError, type EventCreateInput, type EventPatchInput, type EventSnapshot, type Scope } from "./validators";

const FULL = { exceptions: true } as const;
type FullEvent = Prisma.EventGetPayload<{ include: typeof FULL }>;
type Changes = Omit<EventPatchInput, "scope" | "originalStart">;
/** What PATCH/DELETE return so the client can undo via POST /api/calendar/events/restore. */
export type UndoInfo = { snapshots: EventSnapshot[]; deleteIds: string[] };

const DAY_MS = 86_400_000;
const definedOnly = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export async function ownedEvent(userId: string, id: string) {
  const ev = await prisma.event.findFirst({ where: { id, calendar: { userId } }, include: { ...FULL, calendar: true } });
  if (!ev) throw new HttpError(404, "Event not found");
  return ev;
}

export function toSnapshot(e: FullEvent): EventSnapshot {
  return {
    id: e.id,
    calendarId: e.calendarId,
    title: e.title,
    description: e.description,
    location: e.location,
    color: e.color,
    isAllDay: e.isAllDay,
    startAt: e.startAt,
    endAt: e.endAt,
    timezone: e.timezone,
    startDate: e.startDate,
    endDate: e.endDate,
    rrule: e.rrule,
    exceptions: e.exceptions.map((x) => ({
      originalStart: x.originalStart,
      isCancelled: x.isCancelled,
      title: x.title,
      description: x.description,
      location: x.location,
      color: x.color,
      startAt: x.startAt,
      endAt: x.endAt,
      startDate: x.startDate,
      endDate: x.endDate,
    })),
  };
}

/** Normalised DB row: timed events carry no date keys and vice versa; recurrenceEndAt precomputed. */
function eventRow(d: EventCreateInput) {
  const row = {
    calendarId: d.calendarId,
    title: d.title,
    description: d.description ?? null,
    location: d.location ?? null,
    color: d.color ?? null,
    isAllDay: d.isAllDay,
    timezone: d.timezone,
    rrule: d.rrule ?? null,
    ...(d.isAllDay
      ? { startAt: null, endAt: null, startDate: d.startDate!, endDate: d.endDate! }
      : { startAt: d.startAt!, endAt: d.endAt!, startDate: null, endDate: null }),
  };
  return { ...row, recurrenceEndAt: computeRecurrenceEndAt(row) };
}

function assertTiming(d: EventCreateInput) {
  const err = timingError(d);
  if (err) throw new HttpError(400, err);
}

export async function createEvent(input: EventCreateInput) {
  return prisma.event.create({ data: eventRow(input), include: FULL });
}

// ---------- range query ----------

/** The user's occurrences in [start, end), expanded in `tz`. */
export async function occurrencesInRange(userId: string, start: Date, end: Date, tz: string) {
  const startKey = dateKeyInTz(start, tz);
  const endKey = addDaysToKey(dateKeyInTz(new Date(end.getTime() - 1), tz), 1);
  const timedOverlap = { startAt: { lt: end }, endAt: { gt: start } };
  const allDayOverlap = { startDate: { lt: endKey }, endDate: { gt: startKey } };
  const events = await prisma.event.findMany({
    where: {
      calendar: { userId },
      OR: [
        { rrule: null, isAllDay: false, ...timedOverlap },
        { rrule: null, isAllDay: true, ...allDayOverlap },
        { rrule: { not: null }, isAllDay: false, startAt: { lt: end }, recurrenceEndAt: { gt: start } },
        {
          rrule: { not: null },
          isAllDay: true,
          startDate: { lt: endKey },
          recurrenceEndAt: { gt: new Date(start.getTime() - 2 * DAY_MS) },
        },
        // Recurring events with an occurrence moved into the range.
        { rrule: { not: null }, exceptions: { some: { OR: [timedOverlap, allDayOverlap] } } },
      ],
    },
    include: FULL,
  });
  return expandEvents(
    events,
    events.flatMap((e) => e.exceptions),
    start,
    end,
    tz,
  );
}

/** Full event plus the specific occurrence (with exception overrides applied). */
export async function eventWithOccurrence(userId: string, id: string, originalStart: Date | null, tz: string) {
  const ev = await ownedEvent(userId, id);
  const ex = originalStart ? ev.exceptions.find((x) => +x.originalStart === +originalStart) : undefined;
  const occurrence =
    ev.rrule && originalStart ? makeOccurrence(ev, originalStart, ex, tz) : firstOccurrence(ev, tz);
  return { event: toSnapshot(ev), occurrence, isReadOnly: ev.calendar.isReadOnly };
}

/** Text search: the first occurrence of each matching event, soonest first. */
export async function searchEvents(userId: string, q: string, tz: string) {
  const contains = { contains: q, mode: "insensitive" as const };
  const events = await prisma.event.findMany({
    where: { calendar: { userId }, OR: [{ title: contains }, { description: contains }, { location: contains }] },
    include: FULL,
    take: 200,
  });
  return events
    .map((e) => firstOccurrence(e, tz))
    .filter((o) => o !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ---------- update ----------

function baseData(ev: FullEvent): EventCreateInput {
  const { exceptions: _exceptions, id: _id, ...rest } = toSnapshot(ev);
  return rest;
}

/** The parent's data positioned at one occurrence. */
function atOccurrence(ev: FullEvent, originalStart: Date): EventCreateInput {
  const base = baseData(ev);
  if (ev.isAllDay) {
    const startDate = originalStart.toISOString().slice(0, 10);
    return { ...base, startDate, endDate: addDaysToKey(startDate, keyDiffDays(ev.startDate!, ev.endDate!)) };
  }
  const dur = ev.endAt!.getTime() - ev.startAt!.getTime();
  return { ...base, startAt: originalStart, endAt: new Date(originalStart.getTime() + dur) };
}

/** Whole calendar days between two versions' starts (in the event's timezone). */
function dayDelta(a: EventCreateInput, b: EventCreateInput): number {
  if (a.isAllDay !== b.isAllDay) return 0;
  if (a.isAllDay) return keyDiffDays(a.startDate!, b.startDate!);
  return keyDiffDays(dateKeyInTz(a.startAt!, a.timezone), dateKeyInTz(b.startAt!, b.timezone));
}

async function writeEvent(id: string, data: EventCreateInput, exceptions?: Prisma.EventExceptionCreateManyEventInput[]) {
  assertTiming(data);
  await prisma.$transaction([
    prisma.event.update({ where: { id }, data: eventRow(data) }),
    ...(exceptions
      ? [
          prisma.eventException.deleteMany({ where: { eventId: id } }),
          prisma.eventException.createMany({ data: exceptions.map((x) => ({ ...x, eventId: id })) }),
        ]
      : []),
  ]);
}

const isFirst = (ev: FullEvent, originalStart: Date) =>
  firstOccurrence(ev, "UTC")?.originalStart?.getTime() === originalStart.getTime();

export async function patchEvent(userId: string, id: string, patch: EventPatchInput): Promise<UndoInfo> {
  const ev = await ownedEvent(userId, id);
  if (ev.calendar.isReadOnly) throw new HttpError(403, "This calendar is read-only");
  if (patch.calendarId && patch.calendarId !== ev.calendarId)
    await ownedCalendar(userId, patch.calendarId, { writable: true });
  const undo: UndoInfo = { snapshots: [toSnapshot(ev)], deleteIds: [] };
  const { scope, originalStart, ...raw } = patch;
  const changes = definedOnly(raw) as Changes;
  // The editor always sends the rule; only a different value counts as editing it.
  const ruleEdited = changes.rrule !== undefined && (changes.rrule ?? null) !== ev.rrule;

  if (!ev.rrule || !originalStart) {
    // Non-recurring, or editing the series definition directly.
    const next = { ...baseData(ev), ...changes } as EventCreateInput;
    const patternChanged = ev.rrule !== (next.rrule ?? null) || ev.isAllDay !== next.isAllDay;
    await writeEvent(ev.id, next, patternChanged && ev.rrule ? [] : undefined);
    return undo;
  }
  if (!isSeriesOccurrence(ev, originalStart)) throw new HttpError(400, "That occurrence does not exist");

  if (scope === "this") {
    const occ = { ...atOccurrence(ev, originalStart), ...changes } as EventCreateInput;
    assertTiming(occ);
    const override = {
      title: changes.title,
      description: changes.description,
      location: changes.location,
      color: changes.color,
      ...(ev.isAllDay
        ? { startDate: changes.startDate ?? undefined, endDate: changes.endDate ?? undefined }
        : { startAt: changes.startAt ?? undefined, endAt: changes.endAt ?? undefined }),
    };
    await prisma.eventException.upsert({
      where: { eventId_originalStart: { eventId: ev.id, originalStart } },
      create: { eventId: ev.id, originalStart, ...override },
      update: { ...override, isCancelled: false },
    });
    return undo;
  }

  if (scope === "following" && !isFirst(ev, originalStart)) {
    const base = atOccurrence(ev, originalStart);
    const next = { ...base, ...changes } as EventCreateInput;
    const rule = seriesRule(ev);
    const splitWall = ev.isAllDay ? originalStart : toWall(originalStart, ev.timezone);
    const { before, after } = splitRRule(ev.rrule, rule.origOptions.dtstart!, splitWall);
    if (!ruleEdited) next.rrule = shiftRRuleDays(after, dayDelta(base, next));
    assertTiming(next);
    const [created] = await prisma.$transaction([
      prisma.event.create({ data: eventRow(next) }),
      prisma.event.update({
        where: { id: ev.id },
        data: { rrule: before, recurrenceEndAt: computeRecurrenceEndAt({ ...ev, rrule: before }) },
      }),
      prisma.eventException.deleteMany({ where: { eventId: ev.id, originalStart: { gte: originalStart } } }),
    ]);
    undo.deleteIds.push(created.id);
    return undo;
  }

  // "all" (or "following" from the first occurrence): move the whole series by the
  // same wall-clock delta this occurrence moved, and apply the other changes.
  const base = atOccurrence(ev, originalStart);
  const occNext = { ...base, ...changes } as EventCreateInput;
  const next = { ...baseData(ev), ...changes } as EventCreateInput;
  let shiftOriginal = (d: Date) => d;
  if (occNext.isAllDay === ev.isAllDay) {
    if (ev.isAllDay) {
      const delta = keyDiffDays(base.startDate!, occNext.startDate!);
      next.startDate = addDaysToKey(ev.startDate!, delta);
      next.endDate = addDaysToKey(next.startDate, keyDiffDays(occNext.startDate!, occNext.endDate!));
      shiftOriginal = (d) => new Date(d.getTime() + delta * DAY_MS);
    } else {
      const tz = ev.timezone;
      const wallDelta = toWall(occNext.startAt!, tz).getTime() - toWall(base.startAt!, tz).getTime();
      const shift = (d: Date) => fromWall(new Date(toWall(d, tz).getTime() + wallDelta), tz);
      next.startAt = shift(ev.startAt!);
      next.endAt = new Date(next.startAt.getTime() + (occNext.endAt!.getTime() - occNext.startAt!.getTime()));
      shiftOriginal = shift;
    }
  }
  const patternChanged = ruleEdited || occNext.isAllDay !== ev.isAllDay;
  if (!ruleEdited) next.rrule = shiftRRuleDays(ev.rrule, dayDelta(base, occNext));
  const exceptions = patternChanged
    ? []
    : toSnapshot(ev).exceptions.map((x) => ({ ...x, originalStart: shiftOriginal(x.originalStart) }));
  await writeEvent(ev.id, next, exceptions);
  return undo;
}

// ---------- delete ----------

export async function deleteEvent(userId: string, id: string, scope: Scope, originalStart: Date | null): Promise<UndoInfo> {
  const ev = await ownedEvent(userId, id);
  if (ev.calendar.isReadOnly) throw new HttpError(403, "This calendar is read-only");
  const undo: UndoInfo = { snapshots: [toSnapshot(ev)], deleteIds: [] };

  if (!ev.rrule || !originalStart || scope === "all" || (scope === "following" && isFirst(ev, originalStart))) {
    await prisma.event.delete({ where: { id } });
  } else if (scope === "this") {
    await prisma.eventException.upsert({
      where: { eventId_originalStart: { eventId: id, originalStart } },
      create: { eventId: id, originalStart, isCancelled: true },
      update: { isCancelled: true },
    });
  } else {
    const splitWall = ev.isAllDay ? originalStart : toWall(originalStart, ev.timezone);
    const { before } = splitRRule(ev.rrule, seriesRule(ev).origOptions.dtstart!, splitWall);
    await prisma.$transaction([
      prisma.event.update({
        where: { id },
        data: { rrule: before, recurrenceEndAt: computeRecurrenceEndAt({ ...ev, rrule: before }) },
      }),
      prisma.eventException.deleteMany({ where: { eventId: id, originalStart: { gte: originalStart } } }),
    ]);
  }
  return undo;
}

// ---------- undo ----------

export async function restoreEvents(userId: string, snapshots: EventSnapshot[], deleteIds: string[]) {
  for (const s of snapshots) await ownedCalendar(userId, s.calendarId, { writable: true });
  const ids = [...deleteIds, ...snapshots.map((s) => s.id)];
  const existing = await prisma.event.findMany({
    where: { id: { in: ids } },
    select: { id: true, calendar: { select: { userId: true, isReadOnly: true } } },
  });
  if (existing.some((e) => e.calendar.userId !== userId || e.calendar.isReadOnly))
    throw new HttpError(403, "Cannot restore that event");
  await prisma.$transaction([
    prisma.event.deleteMany({ where: { id: { in: existing.map((e) => e.id) } } }),
    // Same ids as before, so occurrence ids and exceptions stay valid.
    ...snapshots.map(({ id, exceptions, ...rest }) =>
      prisma.event.create({ data: { id, ...eventRow(rest), exceptions: { create: exceptions } } }),
    ),
  ]);
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { addDaysToKey, fromUserTz, parseDateKey } from "@/lib/calendar/dates";
import { keyDiffDays, type Occurrence } from "@/lib/calendar/recurrence";
import { api } from "@/lib/calendar/client";
import type { EventSnapshotJSON, UndoInfo } from "@/lib/calendar/types";
import type { Scope } from "@/lib/calendar/validators";
import { askScope } from "@/lib/calendar/ui-store";
import type { CalItem } from "./use-calendar-items";
import { useUserTz } from "./use-calendar-settings";

/** New timing for an occurrence: timed (UTC instants) or all-day (date keys, end exclusive). */
export type Timing = { startAt: Date; endAt: Date } | { startDate: string; endDate: string };
type Target = Pick<Occurrence, "eventId" | "occurrenceId" | "isRecurring" | "originalStart"> &
  Partial<Pick<Occurrence, "start" | "startDate">>;

/** Which cached occurrences a scoped change touches. */
function matcher(item: Target, scope: Scope) {
  if (!item.isRecurring || scope === "this") return (o: Occurrence) => o.occurrenceId === item.occurrenceId;
  if (scope === "all") return (o: Occurrence) => o.eventId === item.eventId;
  const from = item.originalStart?.getTime() ?? 0;
  return (o: Occurrence) => o.eventId === item.eventId && (o.originalStart?.getTime() ?? 0) >= from;
}

const OCCURRENCES = ["cal-occurrences"];
const refreshKeys = ["cal-occurrences", "cal-schedule", "cal-search", "cal-event"];

/** Event mutations: optimistic cache edits, rollback + toast on error, Undo snackbar on success. */
export function useEventMutations() {
  const qc = useQueryClient();
  const tz = useUserTz();

  const refresh = () => refreshKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  async function mutate<T>(optimistic: (list: Occurrence[]) => Occurrence[], request: () => Promise<T>) {
    await qc.cancelQueries({ queryKey: OCCURRENCES });
    const snapshot = qc.getQueriesData<Occurrence[]>({ queryKey: OCCURRENCES });
    qc.setQueriesData<Occurrence[]>({ queryKey: OCCURRENCES }, (old) => old && optimistic(old));
    try {
      return await request();
    } catch (e) {
      snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(`Couldn't save: ${(e as Error).message}`);
      return null;
    } finally {
      refresh();
    }
  }

  const undo = (info: UndoInfo) =>
    api("/api/calendar/events/restore", { method: "POST", json: info }).then(refresh, (e: Error) => toast.error(e.message));
  const snackbar = (message: string, info: UndoInfo) => toast(message, { action: { label: "Undo", onClick: () => undo(info) } });

  const resolveScope = async (item: Target, scope?: Scope) => scope ?? (item.isRecurring ? await askScope("edit") : "all");

  function retime(o: Occurrence, item: Target, t: Timing): Occurrence {
    if ("startDate" in t) {
      const delta = keyDiffDays(item.startDate!, t.startDate);
      const startDate = addDaysToKey(o.startDate!, delta);
      const endDate = addDaysToKey(startDate, keyDiffDays(t.startDate, t.endDate));
      return {
        ...o,
        startDate,
        endDate,
        start: fromUserTz(parseDateKey(startDate), tz),
        end: fromUserTz(parseDateKey(endDate), tz),
      };
    }
    const start = new Date(o.start.getTime() + (t.startAt.getTime() - item.start!.getTime()));
    return { ...o, start, end: new Date(start.getTime() + (t.endAt.getTime() - t.startAt.getTime())) };
  }

  /** Drag-move / resize. */
  async function move(item: CalItem, timing: Timing) {
    const scope = await resolveScope(item);
    if (!scope) return;
    const hits = matcher(item, scope);
    const res = await mutate(
      (list) => list.map((o) => (hits(o) ? retime(o, item, timing) : o)),
      () =>
        api<UndoInfo>(`/api/calendar/events/${item.eventId}`, {
          method: "PATCH",
          json: { scope, originalStart: item.originalStart, ...timing },
        }),
    );
    if (res) snackbar("Event saved", res);
  }

  /** Moves an item by whole days, keeping its times (all-day bars, month view). */
  const shiftDays = (item: CalItem, days: number) =>
    move(
      item,
      item.isAllDay
        ? { startDate: addDaysToKey(item.startDate!, days), endDate: addDaysToKey(item.endDate!, days) }
        : { startAt: fromUserTz(addDays(item.fStart, days), tz), endAt: fromUserTz(addDays(item.fEnd, days), tz) },
    );

  /** Field edits (editor, colour change). Resolves with the scope used, or null if cancelled/failed. */
  async function update(item: Target, changes: Partial<EventSnapshotJSON>, scopeArg?: Scope) {
    const scope = await resolveScope(item, scopeArg);
    if (!scope) return null;
    const hits = matcher(item, scope);
    const res = await mutate(
      (list) =>
        list.map((o) =>
          hits(o)
            ? {
                ...o,
                ...(changes.title !== undefined && { title: changes.title }),
                ...(changes.color !== undefined && { color: changes.color }),
              }
            : o,
        ),
      () =>
        api<UndoInfo>(`/api/calendar/events/${item.eventId}`, {
          method: "PATCH",
          json: { ...changes, scope, originalStart: item.originalStart },
        }),
    );
    if (res) snackbar("Event saved", res);
    return res ? scope : null;
  }

  async function remove(item: Target) {
    const scope = item.isRecurring ? await askScope("delete") : "all";
    if (!scope) return false;
    const hits = matcher(item, scope);
    const qs = new URLSearchParams({ scope });
    if (item.originalStart) qs.set("originalStart", item.originalStart.toISOString());
    const res = await mutate(
      (list) => list.filter((o) => !hits(o)),
      () => api<UndoInfo>(`/api/calendar/events/${item.eventId}?${qs}`, { method: "DELETE" }),
    );
    if (res) snackbar("Event deleted", res);
    return !!res;
  }

  async function create(payload: Omit<EventSnapshotJSON, "id" | "exceptions">) {
    const temp: Occurrence = {
      occurrenceId: `temp-${Date.now()}`,
      eventId: "temp",
      originalStart: null,
      isRecurring: false,
      title: payload.title,
      description: payload.description ?? null,
      location: payload.location ?? null,
      color: payload.color ?? null,
      calendarId: payload.calendarId,
      isAllDay: payload.isAllDay,
      start: payload.startAt ? new Date(payload.startAt) : fromUserTz(parseDateKey(payload.startDate!), tz),
      end: payload.endAt ? new Date(payload.endAt) : fromUserTz(parseDateKey(payload.endDate!), tz),
      startDate: payload.startDate ?? null,
      endDate: payload.endDate ?? null,
      rrule: payload.rrule ?? null,
      timezone: payload.timezone,
    };
    const res = await mutate(
      (list) => (payload.rrule ? list : [...list, temp]),
      () => api<{ id: string }>("/api/calendar/events", { method: "POST", json: payload }),
    );
    if (res) toast("Event saved");
    return res;
  }

  return { move, shiftDays, update, remove, create, refresh };
}

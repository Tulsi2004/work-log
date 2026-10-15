"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/lib/calendar/client";
import { colorName, EVENT_COLORS } from "@/lib/calendar/colors";
import {
  addDaysToKey,
  calendarPath,
  formatTime,
  isValidTimeZone,
  nextHalfHour,
  parseDateKey,
  timeZoneLabel,
  toUserTz,
} from "@/lib/calendar/dates";
import { keyDiffDays, type Occurrence } from "@/lib/calendar/recurrence";
import type { EventDetail } from "@/lib/calendar/types";
import { askScope } from "@/lib/calendar/ui-store";
import { eventCreateSchema } from "@/lib/calendar/validators";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { useCalendars, useSettings, useUserTz } from "@/hooks/calendar/use-calendar-settings";
import { useEventMutations } from "@/hooks/calendar/use-event-mutations";
import { ColorSwatches, IconButton } from "./parts";
import { RecurrenceSelect } from "./recurrence-controls";

/** What the form edits. Times are "HH:mm" wall times in `tz`; for all-day the end date is inclusive. */
type Form = {
  title: string;
  isAllDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  tz: string;
  rrule: string | null;
  location: string;
  calendarId: string;
  color: string | null;
  description: string;
};

type Target = Pick<Occurrence, "eventId" | "occurrenceId" | "isRecurring" | "originalStart">;
type Mode = { kind: "new" } | { kind: "edit"; target: Target; readOnly: boolean; originalRule: string | null };

// Wall times as fake-UTC dates: plain clock arithmetic with no DST in the way.
const wall = (key: string, time: string) => new Date(`${key}T${time}:00.000Z`);
const wallKey = (w: Date) => w.toISOString().slice(0, 10);
const wallTime = (w: Date) => w.toISOString().slice(11, 16);
const STEPS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);

function timedFields(start: Date, end: Date, tz: string) {
  return {
    startDate: formatInTimeZone(start, tz, "yyyy-MM-dd"),
    startTime: formatInTimeZone(start, tz, "HH:mm"),
    endDate: formatInTimeZone(end, tz, "yyyy-MM-dd"),
    endTime: formatInTimeZone(end, tz, "HH:mm"),
  };
}

/** "(30 mins)", "(1 hr)", "(1.5 hrs)" */
function durationLabel(mins: number) {
  if (mins < 60) return `(${mins} mins)`;
  const hrs = Math.round((mins / 60) * 100) / 100;
  return `(${hrs} hr${hrs === 1 ? "" : "s"})`;
}

function EventEditor({ initial, mode }: { initial: Form; mode: Mode }) {
  const router = useRouter();
  const { view, date } = useCalendarRoute();
  const { timezone: userTz, timeFormat: fmt } = useSettings();
  const calendars = useCalendars();
  const { create, update } = useEventMutations();
  const [f, setF] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTz, setShowTz] = useState(initial.tz !== userTz);
  const zones = useMemo(() => (showTz ? Intl.supportedValuesOf("timeZone") : []), [showTz]);
  const back = calendarPath(view, date);
  const readOnly = mode.kind === "edit" && mode.readOnly;
  const writable = calendars.filter((c) => c.kind === "OWNED" && !c.isReadOnly);
  const cal = calendars.find((c) => c.id === f.calendarId);
  const patch = (p: Partial<Form>) => setF((cur) => ({ ...cur, ...p }));

  const clock = (t: string) => formatTime(parseDateKey(`2000-01-01T${t}`), fmt, true);
  const startLocal = parseDateKey(`${f.startDate}T${f.isAllDay ? "00:00" : f.startTime}`);
  const durMin = (wall(f.endDate, f.endTime).getTime() - wall(f.startDate, f.startTime).getTime()) / 60_000;

  // Moving the start keeps the day span (dates) or the duration (times).
  const setStartDate = (v: string) => {
    if (!v) return;
    patch({ startDate: v, endDate: addDaysToKey(v, Math.max(0, keyDiffDays(f.startDate, f.endDate))) });
  };
  const setStartTime = (v: string) => {
    const end = new Date(wall(f.startDate, v).getTime() + Math.max(15, durMin) * 60_000);
    patch({ startTime: v, endDate: wallKey(end), endTime: wallTime(end) });
  };
  const sameDay = f.startDate === f.endDate;
  const endTimes = (sameDay ? STEPS.filter((t) => t > f.startTime) : STEPS).concat(
    STEPS.includes(f.endTime) ? [] : [f.endTime],
  );
  const startTimes = STEPS.includes(f.startTime) ? STEPS : [...STEPS, f.startTime].sort();

  const payload = () => ({
    calendarId: f.calendarId,
    title: f.title,
    description: f.description || null,
    location: f.location || null,
    color: f.color,
    isAllDay: f.isAllDay,
    timezone: f.tz,
    rrule: f.rrule,
    ...(f.isAllDay
      ? { startAt: null, endAt: null, startDate: f.startDate, endDate: addDaysToKey(f.endDate, 1) }
      : {
          startAt: fromZonedTime(`${f.startDate}T${f.startTime}:00`, f.tz).toISOString(),
          endAt: fromZonedTime(`${f.endDate}T${f.endTime}:00`, f.tz).toISOString(),
          startDate: null,
          endDate: null,
        }),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || saving) return;
    const p = payload();
    const parsed = eventCreateSchema.safeParse(p);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError("");
    setSaving(true);
    let ok = false;
    if (mode.kind === "new") ok = !!(await create(p));
    else {
      const ruleUnchanged = (f.rrule ?? null) === (mode.originalRule ?? null);
      const scope = mode.target.isRecurring ? await askScope("edit", ruleUnchanged) : "all";
      if (scope) ok = !!(await update(mode.target, p, scope));
    }
    setSaving(false);
    if (ok) router.push(back);
  };

  const select = "h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50";

  return (
    <form onSubmit={save} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl p-3 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-4">
          <IconButton label="Back to calendar" asChild>
            <Link href={back}>
              <X />
            </Link>
          </IconButton>
          <div className="min-w-0 flex-1 space-y-3">
            <input
              autoFocus={mode.kind === "new"}
              aria-label="Title"
              placeholder="Add title"
              disabled={readOnly}
              value={f.title}
              onChange={(e) => patch({ title: e.target.value })}
              className="h-12 w-full rounded-t-md border-b-2 border-border bg-muted px-3 text-xl outline-none focus:border-primary sm:text-2xl"
            />
            <fieldset disabled={readOnly} className="flex flex-wrap items-center gap-2 text-sm">
              <Input
                type="date"
                aria-label="Start date"
                value={f.startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              {!f.isAllDay && (
                <select aria-label="Start time" value={f.startTime} onChange={(e) => setStartTime(e.target.value)} className={select}>
                  {startTimes.map((t) => (
                    <option key={t} value={t}>
                      {clock(t)}
                    </option>
                  ))}
                </select>
              )}
              <span>to</span>
              {!f.isAllDay && (
                <select aria-label="End time" value={f.endTime} onChange={(e) => patch({ endTime: e.target.value })} className={select}>
                  {endTimes.map((t) => (
                    <option key={t} value={t}>
                      {clock(t)}
                      {sameDay && t > f.startTime
                        ? ` ${durationLabel((wall(f.startDate, t).getTime() - wall(f.startDate, f.startTime).getTime()) / 60_000)}`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
              <Input
                type="date"
                aria-label="End date"
                min={f.startDate}
                value={f.endDate}
                onChange={(e) => e.target.value && patch({ endDate: e.target.value })}
                className="w-auto"
              />
            </fieldset>
            {showTz && !f.isAllDay && (
              <div className="flex items-center gap-2 text-sm">
                <select
                  aria-label="Event time zone"
                  disabled={readOnly}
                  value={f.tz}
                  onChange={(e) => patch({ tz: e.target.value })}
                  className={cn(select, "max-w-full")}
                >
                  {(zones.includes(f.tz) ? zones : [f.tz, ...zones]).map((z) => (
                    <option key={z} value={z}>
                      {timeZoneLabel(z)} {z}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <fieldset disabled={readOnly} className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={f.isAllDay}
                  onChange={(e) => patch({ isAllDay: e.target.checked })}
                  className="size-4"
                />
                All day
              </label>
              {!f.isAllDay && (
                <Button type="button" variant="link" className="h-auto px-0" onClick={() => setShowTz(!showTz)}>
                  Time zone
                </Button>
              )}
              <RecurrenceSelect value={f.rrule} onChange={(rrule) => patch({ rrule })} start={startLocal} className="max-w-full" />
            </fieldset>
          </div>
          <Button type="submit" disabled={readOnly || saving} className="h-9 rounded-full px-6">
            Save
          </Button>
        </div>

        {readOnly && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This event belongs to a read-only calendar and can&apos;t be changed.
          </p>
        )}
        {error && <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <fieldset disabled={readOnly} className="mt-6 space-y-4 sm:pl-14">
          <h2 className="inline-block border-b-2 border-primary pb-1 text-sm font-medium text-primary">Event details</h2>
          <Input
            aria-label="Location"
            placeholder="Add location"
            value={f.location}
            onChange={(e) => patch({ location: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Calendar"
              value={f.calendarId}
              onChange={(e) => patch({ calendarId: e.target.value })}
              className={cn(select, "min-w-0 flex-1 sm:flex-none")}
            >
              {(cal && !writable.includes(cal) ? [cal, ...writable] : writable).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" aria-label={`Event colour: ${f.color ? colorName(f.color) : "Calendar color"}`}>
                  <span className="size-4 rounded-full" style={{ backgroundColor: f.color ?? cal?.color }} />
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <ColorSwatches
                  colors={[...EVENT_COLORS, { name: "Calendar color", hex: null }]}
                  value={f.color}
                  nullColor={cal?.color}
                  onPick={(color) => patch({ color })}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Textarea
            aria-label="Description"
            placeholder="Add description"
            rows={6}
            value={f.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </fieldset>
      </div>
    </form>
  );
}

type Prefill = {
  start?: string;
  end?: string;
  allDay: boolean;
  title?: string;
  calendarId?: string;
  description?: string;
  location?: string;
  rrule?: string;
  color?: string;
  tz?: string;
};

const isKey = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isInstant = (s?: string): s is string => !!s && !isNaN(Date.parse(s));

/** /calendar/event/new — prefilled from the URL (Quick Create's "More options", Duplicate, shortcuts). */
export function NewEventEditor({ prefill }: { prefill: Prefill }) {
  const { timezone: userTz, defaultEventDuration } = useSettings();
  const calendars = useCalendars();
  const [initial] = useState<Form>(() => {
    const tz = prefill.tz && isValidTimeZone(prefill.tz) ? prefill.tz : userTz;
    const writable = calendars.filter((c) => c.kind === "OWNED" && !c.isReadOnly);
    const calendarId =
      writable.find((c) => c.id === prefill.calendarId)?.id ?? writable.find((c) => c.isPrimary)?.id ?? writable[0]?.id ?? "";
    // Times to fall back on (and to use if "All day" is unticked): the next half hour.
    const now = nextHalfHour(toUserTz(new Date(), tz));
    const start = fromZonedTime(now, tz);
    const fallback = timedFields(start, new Date(start.getTime() + defaultEventDuration * 60_000), tz);
    let timing = fallback;
    let isAllDay = false;
    if (prefill.allDay && isKey(prefill.start) && isKey(prefill.end) && prefill.end > prefill.start) {
      isAllDay = true;
      timing = { ...fallback, startDate: prefill.start, endDate: addDaysToKey(prefill.end, -1) };
    } else if (isInstant(prefill.start) && isInstant(prefill.end) && Date.parse(prefill.end) > Date.parse(prefill.start)) {
      timing = timedFields(new Date(prefill.start), new Date(prefill.end), tz);
    }
    return {
      ...timing,
      isAllDay,
      tz,
      title: prefill.title ?? "",
      rrule: prefill.rrule ?? null,
      location: prefill.location ?? "",
      calendarId,
      color: prefill.color && /^#[0-9a-f]{6}$/i.test(prefill.color) ? prefill.color : null,
      description: prefill.description ?? "",
    };
  });
  return <EventEditor initial={initial} mode={{ kind: "new" }} />;
}

/** /calendar/event/{eventId[:originalStart]}/edit — one occurrence of a series, or a one-off event. */
export function EditEventEditor({ occurrenceId }: { occurrenceId: string }) {
  const tz = useUserTz();
  const { view, date } = useCalendarRoute();
  const [eventId, ...rest] = occurrenceId.split(":");
  const originalStart = rest.join(":") || null;
  const query = useQuery({
    queryKey: ["cal-event", eventId, originalStart],
    queryFn: () => {
      const qs = new URLSearchParams({ tz, ...(originalStart ? { originalStart } : {}) });
      return api<EventDetail>(`/api/calendar/events/${eventId}?${qs}`);
    },
    staleTime: Infinity,
  });

  if (query.isLoading)
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  const d = query.data;
  if (!d?.occurrence)
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-6">
        <p>{query.error?.message ?? "That event no longer exists."}</p>
        <Button asChild variant="outline">
          <Link href={calendarPath(view, date)}>Back to calendar</Link>
        </Button>
      </div>
    );

  const ev = d.event;
  const occ = d.occurrence;
  const timing = ev.isAllDay
    ? { startDate: occ.startDate!, endDate: addDaysToKey(occ.endDate!, -1), startTime: "09:00", endTime: "10:00" }
    : timedFields(new Date(occ.start), new Date(occ.end), ev.timezone);
  const initial: Form = {
    title: occ.title === "(No title)" ? "" : occ.title,
    isAllDay: ev.isAllDay,
    ...timing,
    tz: ev.timezone,
    rrule: ev.rrule ?? null,
    location: occ.location ?? "",
    calendarId: ev.calendarId,
    color: occ.color,
    description: occ.description ?? "",
  };
  const target: Target = {
    eventId,
    occurrenceId,
    isRecurring: !!ev.rrule,
    originalStart: originalStart ? new Date(originalStart) : null,
  };
  return (
    <EventEditor
      key={`${occurrenceId}-${query.dataUpdatedAt}`}
      initial={initial}
      mode={{ kind: "edit", target, readOnly: d.isReadOnly, originalRule: ev.rrule ?? null }}
    />
  );
}

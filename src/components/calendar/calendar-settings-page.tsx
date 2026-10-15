"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CALENDAR_COLORS, colorName } from "@/lib/calendar/colors";
import { calendarPath, isValidTimeZone, timeZoneLabel, VIEW_LABELS, VIEWS } from "@/lib/calendar/dates";
import type { CalendarDTO, CalendarSettings } from "@/lib/calendar/types";
import { useUI } from "@/lib/calendar/ui-store";
import { EVENT_DURATIONS } from "@/lib/calendar/validators";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import {
  useCalendarMutations,
  useCalendars,
  useSettings,
  useUpdateSettings,
} from "@/hooks/calendar/use-calendar-settings";
import { CalendarDialogs, ShortcutsTable } from "./calendar-dialogs";
import { ColorSwatches } from "./parts";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "calendars", label: "My calendars" },
  { id: "shortcuts", label: "Keyboard shortcuts" },
];

const select = "h-9 rounded-md border bg-background px-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm sm:grid-cols-[14rem_1fr] sm:items-center">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function General() {
  const settings = useSettings();
  const { mutate } = useUpdateSettings();
  // Only the fields touched here, so a change saved elsewhere is never overwritten.
  const [edits, setEdits] = useState<Partial<CalendarSettings>>({});
  const [tzText, setTzText] = useState(settings.timezone);
  const zones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const form = { ...settings, ...edits };
  const patch = (p: Partial<CalendarSettings>) => setEdits((e) => ({ ...e, ...p }));

  // Changes save on their own, batched half a second after the last one.
  useEffect(() => {
    if (!Object.keys(edits).length) return;
    const sent = edits;
    const timer = setTimeout(
      () =>
        mutate(sent, {
          onSuccess: () => toast("Settings saved"),
          // Drop what was sent, keeping anything changed again meanwhile.
          onSettled: () =>
            setEdits((cur) =>
              Object.fromEntries(Object.entries(cur).filter(([k, v]) => sent[k as keyof CalendarSettings] !== v)),
            ),
        }),
      500,
    );
    return () => clearTimeout(timer);
  }, [edits, mutate]);

  return (
    <div className="space-y-4">
      <Field label="Time zone">
        <span className="grid gap-1">
          <Input
            list="cal-zones"
            value={tzText}
            onChange={(e) => {
              setTzText(e.target.value);
              if (isValidTimeZone(e.target.value)) patch({ timezone: e.target.value });
            }}
          />
          <datalist id="cal-zones">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          <span className="text-xs text-muted-foreground">{timeZoneLabel(form.timezone)}</span>
        </span>
      </Field>
      <Field label="Week starts on">
        <select
          className={select}
          value={form.weekStartsOn}
          onChange={(e) => patch({ weekStartsOn: Number(e.target.value) as CalendarSettings["weekStartsOn"] })}
        >
          <option value={0}>Sunday</option>
          <option value={1}>Monday</option>
          <option value={6}>Saturday</option>
        </select>
      </Field>
      <Field label="Show weekends">
        <input
          type="checkbox"
          className="size-4"
          checked={form.showWeekends}
          onChange={(e) => patch({ showWeekends: e.target.checked })}
        />
      </Field>
      <Field label="Default view">
        <select
          className={select}
          value={form.defaultView}
          onChange={(e) => patch({ defaultView: e.target.value as CalendarSettings["defaultView"] })}
        >
          {VIEWS.map((v) => (
            <option key={v} value={v}>
              {VIEW_LABELS[v].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Default event duration">
        <select
          className={select}
          value={form.defaultEventDuration}
          onChange={(e) => patch({ defaultEventDuration: Number(e.target.value) })}
        >
          {EVENT_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </Field>
      <Field label="Time format">
        <select
          className={select}
          value={form.timeFormat}
          onChange={(e) => patch({ timeFormat: e.target.value as CalendarSettings["timeFormat"] })}
        >
          <option value="H12">1:00pm</option>
          <option value="H24">13:00</option>
        </select>
      </Field>
    </div>
  );
}

function CalendarSettingsRow({ cal }: { cal: CalendarDTO }) {
  const { update, remove } = useCalendarMutations();
  const [name, setName] = useState(cal.name);
  const [description, setDescription] = useState(cal.description ?? "");
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-wrap items-start gap-3 border-b py-4 last:border-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Colour: ${colorName(cal.color)}`}
            className="mt-1.5 size-6 shrink-0 rounded-full"
            style={{ backgroundColor: cal.color }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <ColorSwatches colors={CALENDAR_COLORS} value={cal.color} onPick={(hex) => hex && update(cal.id, { color: hex })} />
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="grid min-w-0 flex-1 gap-2">
        <Input
          aria-label="Calendar name"
          disabled={cal.isReadOnly}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const next = name.trim();
            if (!next) return setName(cal.name);
            if (next !== cal.name) update(cal.id, { name: next });
          }}
        />
        <Input
          aria-label="Description"
          placeholder="Description"
          disabled={cal.isReadOnly}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (cal.description ?? "") && update(cal.id, { description: description || null })}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              checked={cal.isVisible}
              onChange={(e) => update(cal.id, { isVisible: e.target.checked })}
            />
            Show events
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              checked={!cal.isHidden}
              onChange={(e) => update(cal.id, { isHidden: !e.target.checked })}
            />
            Show in list
          </label>
          {cal.isPrimary && <span className="text-muted-foreground">Primary calendar</span>}
          {cal.isReadOnly && <span className="text-muted-foreground">Read-only</span>}
        </div>
      </div>
      {!cal.isPrimary && (
        <Button variant="ghost" className="text-destructive" onClick={() => setConfirming(true)}>
          Delete
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete "${cal.name}"?`}
        description="All events in this calendar will be permanently deleted."
        onConfirm={() => remove(cal.id)}
      />
    </div>
  );
}

/** /calendar/settings — saves as you go. */
export function CalendarSettingsPage() {
  const { view, date } = useCalendarRoute();
  const calendars = useCalendars();
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-3">
        <Button variant="ghost" size="icon-lg" className="rounded-full" asChild>
          <Link href={calendarPath(view, date)} aria-label="Back to calendar" title="Back to calendar">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl">Calendar settings</h1>
      </div>
      <div className="mx-auto flex max-w-5xl gap-8 p-4 sm:p-6">
        <nav className="sticky top-20 hidden w-44 shrink-0 self-start md:block">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block rounded-r-full px-3 py-2 text-sm hover:bg-muted">
              {s.label}
            </a>
          ))}
        </nav>
        <div className="min-w-0 flex-1 space-y-10">
          <section id="general" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-medium">General</h2>
            <General />
          </section>
          <section id="calendars" className="scroll-mt-20">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-medium">My calendars</h2>
              <Button variant="outline" onClick={() => useUI.getState().set({ dialog: "newCalendar" })}>
                <Plus />
                Create new calendar
              </Button>
            </div>
            {calendars.map((c) => (
              <CalendarSettingsRow key={c.id} cal={c} />
            ))}
          </section>
          <section id="shortcuts" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-medium">Keyboard shortcuts</h2>
            <ShortcutsTable />
          </section>
        </div>
      </div>
      <CalendarDialogs />
    </div>
  );
}

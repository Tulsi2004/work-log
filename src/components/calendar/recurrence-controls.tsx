"use client";

import { useState } from "react";
import { addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { dateKey } from "@/lib/calendar/dates";
import {
  describeRRule,
  formToRRule,
  recurrencePresets,
  rruleToForm,
  WEEKDAY_CODES,
  type RecurrenceForm,
} from "@/lib/calendar/recurrence";
import { useUI } from "@/lib/calendar/ui-store";
import type { Scope } from "@/lib/calendar/validators";

const CUSTOM = "__custom";
const UNITS: { value: RecurrenceForm["freq"]; label: string }[] = [
  { value: "DAILY", label: "day" },
  { value: "WEEKLY", label: "week" },
  { value: "MONTHLY", label: "month" },
  { value: "YEARLY", label: "year" },
];

/** "Does not repeat" / presets for the start date / the current custom rule / Custom…. */
export function RecurrenceSelect({
  value,
  onChange,
  start,
  className,
}: {
  value: string | null;
  onChange: (rrule: string | null) => void;
  /** The (first) start as a local copy. */
  start: Date;
  className?: string;
}) {
  const [custom, setCustom] = useState(false);
  const presets = recurrencePresets(start);
  const isPreset = presets.some((p) => p.value === value);
  return (
    <>
      <select
        aria-label="Repeat"
        value={value ?? ""}
        onChange={(e) => (e.target.value === CUSTOM ? setCustom(true) : onChange(e.target.value || null))}
        className={cn("h-9 rounded-md border bg-background px-2 text-sm", className)}
      >
        {presets.map((p) => (
          <option key={p.label} value={p.value ?? ""}>
            {p.label}
          </option>
        ))}
        {value && !isPreset && <option value={value}>{describeRRule(value, start)}</option>}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {custom && (
        <CustomRecurrenceDialog
          rrule={value}
          start={start}
          onDone={(rrule) => {
            onChange(rrule);
            setCustom(false);
          }}
          onCancel={() => setCustom(false)}
        />
      )}
    </>
  );
}

function CustomRecurrenceDialog({
  rrule,
  start,
  onDone,
  onCancel,
}: {
  rrule: string | null;
  start: Date;
  onDone: (rrule: string) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(() => rruleToForm(rrule, start, dateKey(addMonths(start, 3))));
  const patch = (p: Partial<RecurrenceForm>) => setF({ ...f, ...p });
  const plural = f.interval > 1 ? "s" : "";

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Custom recurrence</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-sm">
          Repeat every
          <Input
            type="number"
            min={1}
            max={999}
            aria-label="Interval"
            value={f.interval}
            onChange={(e) => patch({ interval: Math.min(999, Math.max(1, Number(e.target.value) || 1)) })}
            className="w-16"
          />
          <select
            aria-label="Unit"
            value={f.freq}
            onChange={(e) => patch({ freq: e.target.value as RecurrenceForm["freq"] })}
            className="h-8 rounded-md border bg-background px-2"
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
                {plural}
              </option>
            ))}
          </select>
        </div>

        {f.freq === "WEEKLY" && (
          <fieldset className="space-y-2 text-sm">
            <legend className="mb-2">Repeat on</legend>
            <div className="flex gap-1.5">
              {WEEKDAY_CODES.map((code, i) => {
                const on = f.byDay.includes(code);
                const name = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i];
                return (
                  <button
                    key={code}
                    type="button"
                    aria-label={name}
                    aria-pressed={on}
                    onClick={() => patch({ byDay: on ? f.byDay.filter((d) => d !== code) : [...f.byDay, code] })}
                    className={cn(
                      "size-8 rounded-full text-xs font-medium",
                      on ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
                    )}
                  >
                    {name[0]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {f.freq === "MONTHLY" && (
          <select
            aria-label="Monthly on"
            value={f.monthlyMode}
            onChange={(e) => patch({ monthlyMode: e.target.value as RecurrenceForm["monthlyMode"] })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="day">Monthly on day {start.getDate()}</option>
            <option value="nth">{recurrencePresets(start)[3].label}</option>
          </select>
        )}

        <fieldset className="space-y-2 text-sm">
          <legend className="mb-2">Ends</legend>
          <label className="flex h-8 items-center gap-3">
            <input type="radio" name="ends" checked={f.ends === "never"} onChange={() => patch({ ends: "never" })} />
            Never
          </label>
          <label className="flex h-8 items-center gap-3">
            <input type="radio" name="ends" checked={f.ends === "on"} onChange={() => patch({ ends: "on" })} />
            <span className="w-12">On</span>
            <Input
              type="date"
              aria-label="End date"
              disabled={f.ends !== "on"}
              value={f.until}
              min={dateKey(start)}
              onChange={(e) => e.target.value && patch({ until: e.target.value })}
              className="w-40"
            />
          </label>
          <label className="flex h-8 items-center gap-3">
            <input type="radio" name="ends" checked={f.ends === "after"} onChange={() => patch({ ends: "after" })} />
            <span className="w-12">After</span>
            <Input
              type="number"
              min={1}
              max={1000}
              aria-label="Occurrences"
              disabled={f.ends !== "after"}
              value={f.count}
              onChange={(e) => patch({ count: Math.min(1000, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-20"
            />
            occurrences
          </label>
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onDone(formToRRule(f, start))}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SCOPES: { value: Scope; label: string }[] = [
  { value: "this", label: "This event" },
  { value: "following", label: "This and following events" },
  { value: "all", label: "All events" },
];

function ScopeDialog({ prompt }: { prompt: NonNullable<ReturnType<typeof useUI.getState>["scopePrompt"]> }) {
  const [choice, setChoice] = useState<Scope>(prompt.allowThis ? "this" : "following");
  const finish = (scope: Scope | null) => {
    useUI.getState().set({ scopePrompt: null });
    prompt.resolve(scope);
  };
  return (
    <Dialog open onOpenChange={(open) => !open && finish(null)}>
      <DialogContent className="sm:max-w-xs" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{prompt.kind === "edit" ? "Edit recurring event" : "Delete recurring event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          {SCOPES.filter((s) => prompt.allowThis || s.value !== "this").map((s) => (
            <label key={s.value} className="flex h-9 items-center gap-3">
              <input type="radio" name="scope" checked={choice === s.value} onChange={() => setChoice(s.value)} />
              {s.label}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => finish(null)}>
            Cancel
          </Button>
          <Button onClick={() => finish(choice)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Answers askScope(): which occurrences of a repeating event a change applies to. */
export function RecurringScopeDialog() {
  const prompt = useUI((s) => s.scopePrompt);
  return prompt ? <ScopeDialog prompt={prompt} /> : null;
}

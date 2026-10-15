"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CALENDAR_COLORS } from "@/lib/calendar/colors";
import { dateKey, parseDateKey } from "@/lib/calendar/dates";
import { useUI } from "@/lib/calendar/ui-store";
import { calendarCreateSchema } from "@/lib/calendar/validators";
import { useCalendarMutations } from "@/hooks/calendar/use-calendar-settings";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { ColorSwatches } from "./parts";

export const SHORTCUTS: [string, string][] = [
  ["c", "Create event"],
  ["t", "Today"],
  ["j / n", "Next period"],
  ["k / p", "Previous period"],
  ["d", "Day view"],
  ["w", "Week view"],
  ["m", "Month view"],
  ["y", "Year view"],
  ["a", "Schedule view"],
  ["x", "4 days view"],
  ["/", "Search"],
  ["?", "Keyboard shortcuts"],
  ["e", "Edit the open event"],
  ["Backspace / Delete", "Delete the open event"],
  ["Esc", "Close popover or search"],
  ["s", "Settings"],
  ["g", "Go to date"],
];

export function ShortcutsTable() {
  return (
    <table className="w-full text-sm">
      <tbody>
        {SHORTCUTS.map(([keys, action]) => (
          <tr key={keys} className="border-b last:border-0">
            <td className="py-1.5 pr-4">
              {keys.split(" / ").map((k, i) => (
                <span key={k}>
                  {i > 0 && " / "}
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
                </span>
              ))}
            </td>
            <td className="py-1.5">{action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GoToDate({ onClose }: { onClose: () => void }) {
  const { view, date, go } = useCalendarRoute();
  const [value, setValue] = useState(dateKey(date));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        onClose();
        go(view, parseDateKey(value));
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Go to date</DialogTitle>
      </DialogHeader>
      <Input type="date" aria-label="Date" autoFocus required value={value} onChange={(e) => setValue(e.target.value)} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Go</Button>
      </DialogFooter>
    </form>
  );
}

function NewCalendar({ onClose }: { onClose: () => void }) {
  const { create } = useCalendarMutations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7986cb");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = calendarCreateSchema.safeParse({ name, description, color });
        if (!parsed.success) return setError(parsed.error.issues[0].message);
        const cal = await create(parsed.data);
        if (!cal) return;
        toast(`Calendar "${cal.name}" created`);
        onClose();
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Create new calendar</DialogTitle>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="cal-name">Name</Label>
        <Input id="cal-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cal-description">Description</Label>
        <Textarea id="cal-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Colour</Label>
        <ColorSwatches colors={CALENDAR_COLORS} value={color} onPick={(hex) => hex && setColor(hex)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Create calendar</Button>
      </DialogFooter>
    </form>
  );
}

/** Shortcuts, Go to date and Create calendar — mounted only while open, so each opening starts fresh. */
export function CalendarDialogs() {
  const dialog = useUI((s) => s.dialog);
  const close = () => useUI.getState().set({ dialog: null });
  return (
    <Dialog open={!!dialog} onOpenChange={(open) => !open && close()}>
      {dialog && (
        <DialogContent className={dialog === "shortcuts" ? "sm:max-w-md" : "sm:max-w-sm"}>
          {dialog === "shortcuts" ? (
            <>
              <DialogHeader>
                <DialogTitle>Keyboard shortcuts</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                <ShortcutsTable />
              </div>
            </>
          ) : dialog === "goto" ? (
            <GoToDate onClose={close} />
          ) : (
            <NewCalendar onClose={close} />
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

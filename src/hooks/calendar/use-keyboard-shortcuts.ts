"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { addMinutes, startOfDay } from "date-fns";
import { navigate, nextHalfHour, toUserTz, VIEW_LABELS, VIEWS, type ViewKey } from "@/lib/calendar/dates";
import { editHref, newEventHref } from "@/lib/calendar/routes";
import { useUI } from "@/lib/calendar/ui-store";
import { useCalendarRoute } from "./use-calendar-route";
import { useSettings } from "./use-calendar-settings";
import { useEventMutations } from "./use-event-mutations";

const VIEW_BY_KEY = Object.fromEntries(VIEWS.map((v) => [VIEW_LABELS[v].key.toLowerCase(), v])) as Record<
  string,
  ViewKey
>;

/** Single-key shortcuts; ignored while typing, with a modifier held, or while a dialog is open. */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const { view, date, go } = useCalendarRoute();
  const settings = useSettings();
  const { remove } = useEventMutations();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if ((e.target as HTMLElement).closest?.("input, textarea, select, [contenteditable='true']")) return;
      const ui = useUI.getState();
      if (ui.dialog || ui.scopePrompt || document.querySelector('[data-slot$="dialog-content"]')) return;
      const detail = ui.popover?.kind === "detail" ? ui.popover.item : null;
      const tz = settings.timezone;
      const today = startOfDay(toUserTz(new Date(), tz));

      const run = (): boolean => {
        if (VIEW_BY_KEY[e.key]) return go(VIEW_BY_KEY[e.key], date), true;
        switch (e.key) {
          case "c": {
            const start = nextHalfHour(toUserTz(new Date(), tz));
            router.push(newEventHref({ start, end: addMinutes(start, settings.defaultEventDuration), isAllDay: false }, tz));
            return true;
          }
          case "t":
            return go(view, today), true;
          case "j":
          case "n":
            return go(view, navigate(view, date, 1)), true;
          case "k":
          case "p":
            return go(view, navigate(view, date, -1)), true;
          case "/":
            ui.set({ searchOpen: true });
            requestAnimationFrame(() => document.getElementById("cal-search")?.focus());
            return true;
          case "?":
            return ui.set({ dialog: "shortcuts" }), true;
          case "g":
            return ui.set({ dialog: "goto" }), true;
          case "s":
            return router.push("/calendar/settings"), true;
          case "e":
            if (!detail || detail.readOnly) return false;
            ui.closePopover();
            return router.push(editHref(detail.occurrenceId)), true;
          case "Backspace":
          case "Delete":
            if (!detail || detail.readOnly) return false;
            ui.closePopover();
            return remove(detail), true;
        }
        return false;
      };
      if (run()) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, view, date, go, settings, remove]);
}

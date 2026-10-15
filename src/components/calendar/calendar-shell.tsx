"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { calendarPath, dateKey, isValidTimeZone } from "@/lib/calendar/dates";
import { useUI } from "@/lib/calendar/ui-store";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { useUpdateSettings } from "@/hooks/calendar/use-calendar-settings";
import { useKeyboardShortcuts } from "@/hooks/calendar/use-keyboard-shortcuts";
import { CalendarDialogs } from "./calendar-dialogs";
import { CalendarSidebar } from "./calendar-sidebar";
import { CalendarToolbar } from "./calendar-toolbar";
import { EventPopovers } from "./event-popovers";
import { ScheduleView, YearView } from "./list-views";
import { MonthView } from "./month-view";
import { RecurringScopeDialog } from "./recurrence-controls";
import { TimeGridView } from "./time-grid-view";

// Phones get Day view on the first load instead of a cramped week or month — once per visit.
let checkedNarrowScreen = false;

function CalendarMain() {
  const router = useRouter();
  const { view, date } = useCalendarRoute();
  const key = dateKey(date);

  useEffect(() => {
    useUI.getState().set({ lastView: view, lastDate: key });
  }, [view, key]);

  useEffect(() => {
    if (checkedNarrowScreen) return;
    checkedNarrowScreen = true;
    if (window.matchMedia("(max-width: 767px)").matches && (view === "week" || view === "4days" || view === "month"))
      router.replace(calendarPath("day", date));
    // Only the first view of the visit matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (view === "month") return <MonthView date={date} />;
  if (view === "year") return <YearView date={date} />;
  if (view === "schedule") return <ScheduleView date={date} />;
  return <TimeGridView view={view} date={date} />;
}

function Shortcuts() {
  useKeyboardShortcuts();
  return null;
}

/**
 * The calendar's own chrome under the TULSI navbar. The views render here rather than in
 * their page, so moving between weeks keeps the grid (and its scroll position) mounted.
 */
export function CalendarShell({ detectTimezone, children }: { detectTimezone: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const { onCalendar } = useCalendarRoute();
  const updateSettings = useUpdateSettings();
  const chrome = !pathname.startsWith("/calendar/event") && pathname !== "/calendar/settings";

  // First visit: adopt the browser's time zone instead of the default.
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detectTimezone && tz && isValidTimeZone(tz)) updateSettings.mutate({ timezone: tz });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!chrome)
    return (
      <>
        {children}
        <RecurringScopeDialog />
      </>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CalendarToolbar />
      <div className="flex min-h-0 flex-1">
        <CalendarSidebar />
        <main className="flex min-w-0 flex-1 flex-col">{onCalendar ? <CalendarMain /> : children}</main>
      </div>
      <EventPopovers />
      <RecurringScopeDialog />
      <CalendarDialogs />
      <Shortcuts />
    </div>
  );
}

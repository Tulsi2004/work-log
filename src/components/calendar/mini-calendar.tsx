"use client";

import { useState } from "react";
import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateKey, getVisibleRange, type WeekStart } from "@/lib/calendar/dates";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { useSettings } from "@/hooks/calendar/use-calendar-settings";
import { useNow } from "@/hooks/calendar/use-now";
import { IconButton } from "./parts";

type MonthGridProps = {
  /** Any day of the month to show (local copy). */
  month: Date;
  weekStartsOn: WeekStart;
  today: Date;
  selected?: Date;
  /** A light band behind these days (end exclusive). */
  band?: { start: Date; end: Date } | null;
  /** Date keys that get a dot (Year view: days with events). */
  dots?: Set<string>;
  onPick: (day: Date, el: HTMLElement) => void;
};

/** A 6×7 month of day buttons — the sidebar mini calendar and each month of the Year view. */
export function MonthGrid({ month, weekStartsOn, today, selected, band, dots, onPick }: MonthGridProps) {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn });
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  return (
    <div role="group" aria-label={format(month, "MMMM yyyy")} className="grid grid-cols-7 text-center text-[11px]">
      {days.slice(0, 7).map((d) => (
        <div key={d.getDay()} className="grid h-6 place-items-center font-medium text-muted-foreground">
          {format(d, "EEEEE")}
        </div>
      ))}
      {days.map((d, i) => {
        const isToday = isSameDay(d, today);
        const isSelected = !!selected && isSameDay(d, selected);
        const inBand = !!band && d >= band.start && d < band.end;
        return (
          <div
            key={i}
            className={cn(
              "grid place-items-center py-px",
              inBand && "bg-accent",
              inBand && (i % 7 === 0 || isSameDay(d, band.start)) && "rounded-l-full",
              inBand && (i % 7 === 6 || isSameDay(addDays(d, 1), band.end)) && "rounded-r-full",
            )}
          >
            <button
              type="button"
              aria-label={format(d, "EEEE, MMMM d, yyyy")}
              aria-current={isToday ? "date" : undefined}
              onClick={(e) => onPick(d, e.currentTarget)}
              className={cn(
                "relative grid size-7 place-items-center rounded-full tabular-nums",
                !isSameMonth(d, month) && "text-muted-foreground",
                isToday
                  ? "bg-primary font-semibold text-primary-foreground"
                  : isSelected
                    ? "bg-primary/20 font-semibold text-accent-foreground"
                    : "hover:bg-muted",
              )}
            >
              {format(d, "d")}
              {dots?.has(dateKey(d)) && <span className="absolute bottom-0.5 size-1 rounded-full bg-current" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** The sidebar month: navigates on its own, and follows the main view when that moves. */
export function MiniCalendar() {
  const { view, date, go } = useCalendarRoute();
  const { weekStartsOn, showWeekends } = useSettings();
  const today = useNow();
  const [month, setMonth] = useState(() => startOfMonth(date));
  const [followed, setFollowed] = useState(dateKey(date));
  if (followed !== dateKey(date)) {
    setFollowed(dateKey(date));
    setMonth(startOfMonth(date));
  }
  const band = view === "day" || view === "4days" || view === "week" ? getVisibleRange(view, date, weekStartsOn, showWeekends) : null;

  return (
    <div className="px-3">
      <div className="flex items-center justify-between pl-2">
        <span className="text-sm font-medium">{format(month, "MMMM yyyy")}</span>
        <div className="flex">
          <IconButton label="Previous month" size="icon-sm" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft />
          </IconButton>
          <IconButton label="Next month" size="icon-sm" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight />
          </IconButton>
        </div>
      </div>
      <MonthGrid
        month={month}
        weekStartsOn={weekStartsOn}
        today={today}
        selected={date}
        band={band}
        onPick={(d) => go(view, d)}
      />
    </div>
  );
}

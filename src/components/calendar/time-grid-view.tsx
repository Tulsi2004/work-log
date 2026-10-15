"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { addMinutes, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  addDaysToKey,
  dateKey,
  formatTime,
  formatTimeRange,
  fromUserTz,
  getVisibleRange,
  gmtOffsetLabel,
  hourLabel,
  HOUR_HEIGHT,
  minutesOfDay,
  navigate,
  snapToMinutes,
  type TimeFormatKey,
  type ViewKey,
} from "@/lib/calendar/dates";
import { textColorFor } from "@/lib/calendar/colors";
import { layoutDay, type LayoutBox } from "@/lib/calendar/layout";
import { openDetail, openDraft, useUI } from "@/lib/calendar/ui-store";
import { itemAriaLabel, itemStyle, useCalendarItems, type CalItem } from "@/hooks/calendar/use-calendar-items";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { useCalendars, useSettings } from "@/hooks/calendar/use-calendar-settings";
import { useEventMutations } from "@/hooks/calendar/use-event-mutations";
import { startPointerDrag, timeGridPoint } from "@/hooks/calendar/use-drag";
import { useMounted, useNow } from "@/hooks/calendar/use-now";
import { AllDayRow } from "./all-day-row";

const DAY_MIN = 24 * 60;
const MIN_MS = 60_000;

/** One timed item's piece inside one day column. */
type Segment = { item: CalItem; startMin: number; endMin: number; last: boolean };

/** Splits timed items into per-day pieces; items crossing midnight get one per day. */
function segmentsByDay(items: CalItem[], dayKeys: string[]): Segment[][] {
  return dayKeys.map((k) =>
    items
      .filter((it) => !it.inAllDayRow && it.startKey <= k && k < it.endKey)
      .map((it) => ({
        item: it,
        startMin: k === it.startKey ? minutesOfDay(it.fStart) : 0,
        endMin: k === dateKey(it.fEnd) ? minutesOfDay(it.fEnd) : DAY_MIN,
        last: addDaysToKey(k, 1) === it.endKey,
      })),
  );
}

/** A local copy at `min` minutes into `day` (field arithmetic, so the browser's own DST never interferes). */
function at(day: Date, min: number) {
  const d = new Date(day);
  d.setHours(0, Math.round(min), 0, 0);
  return d;
}

type Handlers = {
  onColumnDown: (e: React.PointerEvent<HTMLDivElement>, col: number) => void;
  onEventDown: (e: React.PointerEvent<HTMLButtonElement>, item: CalItem) => void;
  onResizeDown: (e: React.PointerEvent<HTMLSpanElement>, item: CalItem) => void;
};

const EventBlock = memo(function EventBlock({
  seg,
  box,
  fmt,
  dimmed,
  h,
}: {
  seg: Segment;
  box: LayoutBox;
  fmt: TimeFormatKey;
  dimmed: boolean;
  h: Handlers;
}) {
  const { item } = seg;
  const height = box.height - 1;
  const overlapping = box.left > 0 || box.width < 100;
  return (
    <button
      type="button"
      data-occ={item.occurrenceId}
      aria-label={itemAriaLabel(item, fmt)}
      onPointerDown={(e) => h.onEventDown(e, item)}
      onClick={(e) => e.detail === 0 && openDetail(item, e.currentTarget)}
      className={cn(
        "pointer-events-auto absolute overflow-hidden rounded-[4px] px-1.5 pt-0.5 text-left text-xs leading-tight",
        overlapping && "ring-1 ring-background",
        dimmed && "opacity-40",
      )}
      style={{
        top: box.top,
        height,
        left: `${box.left}%`,
        width: `calc(${box.width}% - 2px)`,
        zIndex: box.zIndex,
        ...itemStyle(item),
      }}
    >
      {height < 38 ? (
        <span className="block truncate">
          <span className="font-medium">{item.title}</span>, {formatTime(item.fStart, fmt)}
        </span>
      ) : (
        <>
          <span className={cn("block font-medium", height >= 60 ? "line-clamp-3" : "truncate")}>{item.title}</span>
          <span className="block truncate">{formatTimeRange(item.fStart, item.fEnd, fmt)}</span>
          {height >= 72 && item.location && <span className="block truncate">{item.location}</span>}
        </>
      )}
      {seg.last && !item.readOnly && (
        <span
          aria-hidden
          onPointerDown={(e) => h.onResizeDown(e, item)}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        />
      )}
    </button>
  );
});

const DayColumn = memo(function DayColumn({
  col,
  dayKey,
  segments,
  nowMin,
  fmt,
  draftColor,
  draggingId,
  h,
}: {
  col: number;
  dayKey: string;
  segments: Segment[];
  nowMin: number | null;
  fmt: TimeFormatKey;
  draftColor: string;
  draggingId: string | null;
  h: Handlers;
}) {
  const boxes = useMemo(
    () =>
      new Map(
        layoutDay(segments.map((s) => ({ id: s.item.occurrenceId, startMin: s.startMin, endMin: s.endMin }))).map(
          (b) => [b.id, b],
        ),
      ),
    [segments],
  );
  const draft = useUI((s) => (s.draft && !s.draft.isAllDay ? s.draft : null));
  const draftTitle = useUI((s) => s.draftTitle);

  let draftBox: { top: number; height: number; anchor: boolean } | null = null;
  if (draft) {
    const sKey = dateKey(draft.start);
    const eKey = minutesOfDay(draft.end) === 0 ? dateKey(draft.end) : addDaysToKey(dateKey(draft.end), 1);
    if (sKey <= dayKey && dayKey < eKey) {
      const s = dayKey === sKey ? minutesOfDay(draft.start) : 0;
      const e = dayKey === dateKey(draft.end) ? minutesOfDay(draft.end) : DAY_MIN;
      draftBox = { top: (s / 60) * HOUR_HEIGHT, height: ((e - s) / 60) * HOUR_HEIGHT, anchor: dayKey === sKey };
    }
  }

  return (
    <div
      role="group"
      aria-label={format(new Date(`${dayKey}T00:00`), "EEEE, MMMM d")}
      onPointerDown={(e) => h.onColumnDown(e, col)}
      className={cn("relative touch-pan-y", col > 0 && "border-l")}
      style={{
        backgroundImage: "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        backgroundSize: `100% ${HOUR_HEIGHT}px`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 right-2">
        {segments.map((s) => {
          const box = boxes.get(s.item.occurrenceId);
          return box ? (
            <EventBlock
              key={s.item.occurrenceId}
              seg={s}
              box={box}
              fmt={fmt}
              dimmed={draggingId === s.item.occurrenceId}
              h={h}
            />
          ) : null;
        })}
      </div>
      {draftBox && draft && (
        <div
          data-draft={draftBox.anchor ? "" : undefined}
          className="pointer-events-none absolute right-2 left-0 z-20 overflow-hidden rounded-[4px] px-1.5 pt-0.5 text-xs leading-tight shadow-lg"
          style={{
            top: draftBox.top,
            height: Math.max(draftBox.height - 1, 18),
            backgroundColor: draftColor,
            color: textColorFor(draftColor),
          }}
        >
          <span className="block truncate font-medium">{draftTitle || "(No title)"}</span>
          <span className="block truncate">{formatTimeRange(draft.start, draft.end, fmt, true)}</span>
        </div>
      )}
      {nowMin !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-40 h-0.5 bg-[#ea4335]"
          style={{ top: (nowMin / 60) * HOUR_HEIGHT - 1 }}
        >
          <span className="absolute -top-[5px] -left-1.5 size-3 rounded-full bg-[#ea4335]" />
        </div>
      )}
    </div>
  );
});

/** Day, 4 days and Week: the all-day strip plus a scrollable 24-hour grid. */
export function TimeGridView({ view, date }: { view: ViewKey; date: Date }) {
  const { weekStartsOn, showWeekends, timeFormat: fmt, timezone: tz, defaultEventDuration } = useSettings();
  const { go } = useCalendarRoute();
  const calendars = useCalendars();
  const draftColor = calendars.find((c) => c.isPrimary)?.color ?? "#039be5";
  const anchorKey = dateKey(date);
  const range = useMemo(
    () => getVisibleRange(view, date, weekStartsOn, showWeekends),
    // `date` is rebuilt every render; its key is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, anchorKey, weekStartsOn, showWeekends],
  );
  const neighbours = useMemo(
    () => [-1, 1].map((d) => getVisibleRange(view, navigate(view, range.start, d as 1 | -1), weekStartsOn, showWeekends)),
    [view, range, weekStartsOn, showWeekends],
  );
  const { items, isLoading } = useCalendarItems(range, neighbours);
  const { move } = useEventMutations();
  const now = useNow();
  const mounted = useMounted();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = range.days;
  const n = days.length;
  const dayKeys = useMemo(() => days.map(dateKey), [days]);
  const allDayItems = useMemo(() => items.filter((i) => i.inAllDayRow), [items]);
  const segments = useMemo(() => segmentsByDay(items, dayKeys), [items, dayKeys]);
  const todayKey = dateKey(now);
  const todayVisible = dayKeys.includes(todayKey);

  // Grid handlers read the latest values through a ref, so the memoised columns keep one stable object.
  const latest = useRef({ days, dayKeys, n, tz, fmt, defaultEventDuration, move, draftColor });
  useLayoutEffect(() => {
    latest.current = { days, dayKeys, n, tz, fmt, defaultEventDuration, move, draftColor };
  });
  const [handlers] = useState<Handlers>(() => {
    const L = () => latest.current;
    const pointerTime = (e: { clientX: number; clientY: number }) => {
      const { col, min } = timeGridPoint(e, colsRef.current!, L().n);
      return at(L().days[col], min);
    };
    const column = (i: number) => colsRef.current!.children[i] as HTMLElement;
    const makeGhost = (item: CalItem) => {
      const g = document.createElement("div");
      g.className = "pointer-events-none absolute left-0 right-2 z-30 overflow-hidden rounded-[4px] px-1.5 pt-0.5 text-xs leading-tight shadow-lg";
      Object.assign(g.style, itemStyle(item));
      return g;
    };
    const showGhost = (g: HTMLElement, day: number, startMin: number, endMin: number, label: string, title: string) => {
      const col = column(day);
      if (g.parentElement !== col) col.appendChild(g);
      g.style.top = `${(startMin / 60) * HOUR_HEIGHT}px`;
      g.style.height = `${Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 18) - 1}px`;
      g.innerHTML = "";
      for (const [text, cls] of [
        [title, "block truncate font-medium"],
        [label, "block truncate"],
      ]) {
        const s = document.createElement("span");
        s.className = cls;
        s.textContent = text;
        g.appendChild(s);
      }
    };

    return {
      // Empty grid: click for a default-length draft at the half hour, drag to draw one in 15-minute steps.
      onColumnDown(e, col) {
        // A click while a popover is open only closes it.
        if (e.button !== 0 || e.target !== e.currentTarget || useUI.getState().popover) return;
        const { days, defaultEventDuration, fmt } = L();
        const colEl = e.currentTarget;
        const day = days[col];
        const downMin = timeGridPoint(e, colsRef.current!, L().n).min;
        const anchor = Math.floor(downMin / 15) * 15;
        let span: [number, number] = [anchor, anchor + 15];
        let ghost: HTMLElement | null = null;
        startPointerDrag(e, {
          onStart: () => {
            ghost = document.createElement("div");
            ghost.className =
              "pointer-events-none absolute left-0 right-2 z-30 overflow-hidden rounded-[4px] px-1.5 pt-0.5 text-xs leading-tight shadow-lg";
            Object.assign(ghost.style, { backgroundColor: L().draftColor, color: textColorFor(L().draftColor) });
          },
          onMove: (ev) => {
            const cur = Math.round(timeGridPoint(ev, colsRef.current!, L().n).min / 15) * 15;
            span = cur > anchor ? [anchor, cur] : [Math.max(0, cur), anchor + 15];
            showGhost(ghost!, col, span[0], span[1], formatTimeRange(at(day, span[0]), at(day, span[1]), fmt, true), "(No title)");
          },
          onEnd: () => {
            ghost?.remove();
            openDraft({ start: at(day, span[0]), end: at(day, span[1]), isAllDay: false }, colEl);
          },
          onClick: () => {
            const start = Math.floor(downMin / 30) * 30;
            openDraft({ start: at(day, start), end: at(day, start + defaultEventDuration), isAllDay: false }, colEl);
          },
          onCancel: () => ghost?.remove(),
        });
      },

      // An event: click for details, drag to move it (across days too) in 15-minute steps.
      onEventDown(e, item) {
        if (e.button !== 0) return;
        e.stopPropagation();
        const el = e.currentTarget;
        if (item.readOnly) return startPointerDrag(e, { onClick: () => openDetail(item, el) });
        const durMin = (item.fEnd.getTime() - item.fStart.getTime()) / MIN_MS;
        const grabMs = pointerTime(e).getTime() - item.fStart.getTime();
        let target = item.fStart;
        const ghost = makeGhost(item);
        const done = () => {
          ghost.remove();
          setDraggingId(null);
        };
        startPointerDrag(e, {
          onStart: () => setDraggingId(item.occurrenceId),
          onMove: (ev) => {
            target = snapToMinutes(new Date(pointerTime(ev).getTime() - grabMs), 15);
            const day = L().dayKeys.indexOf(dateKey(target));
            if (day === -1) return void (ghost.style.display = "none");
            ghost.style.display = "";
            const s = minutesOfDay(target);
            showGhost(ghost, day, s, Math.min(DAY_MIN, s + durMin), formatTimeRange(target, addMinutes(target, durMin), L().fmt), item.title);
          },
          onEnd: () => {
            done();
            if (target.getTime() === item.fStart.getTime()) return;
            const startAt = fromUserTz(target, L().tz);
            L().move(item, { startAt, endAt: new Date(startAt.getTime() + (item.end.getTime() - item.start.getTime())) });
          },
          onClick: () => {
            done();
            openDetail(item, el);
          },
          onCancel: done,
        });
      },

      // The bottom handle: stretch or shrink the end, never below 15 minutes.
      onResizeDown(e, item) {
        if (e.button !== 0) return;
        e.stopPropagation();
        const block = (e.currentTarget as HTMLElement).parentElement!;
        const lastDay = new Date(item.fEnd.getTime() - MIN_MS);
        const col = L().dayKeys.indexOf(dateKey(lastDay));
        if (col === -1) return;
        const day = L().days[col];
        const segStart = isSameDay(item.fStart, day) ? minutesOfDay(item.fStart) : 0;
        const minEnd = addMinutes(item.fStart, 15);
        const origHeight = block.style.height;
        let end = item.fEnd;
        const restore = () => {
          block.style.height = origHeight;
        };
        startPointerDrag(e, {
          onMove: (ev) => {
            const min = Math.round(timeGridPoint(ev, colsRef.current!, L().n).min / 15) * 15;
            const candidate = at(day, min);
            end = candidate < minEnd ? minEnd : candidate;
            const endMin = isSameDay(end, day) ? minutesOfDay(end) : DAY_MIN;
            block.style.height = `${Math.max(((endMin - segStart) / 60) * HOUR_HEIGHT, 18) - 1}px`;
          },
          onEnd: () => {
            restore();
            if (end.getTime() !== item.fEnd.getTime()) L().move(item, { startAt: item.start, endAt: fromUserTz(end, L().tz) });
          },
          onCancel: restore,
        });
      },
    };
  });

  // First mount: scroll to about 8 AM, or two hours before now when today is on screen.
  // Later navigation keeps the scroll position, like Google.
  useLayoutEffect(() => {
    const hours = todayVisible ? Math.max(0, now.getHours() - 2) : 8;
    scrollRef.current!.scrollTop = hours * HOUR_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cols = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {isLoading && <div className="absolute inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary" />}
      <div className="flex shrink-0 overflow-y-hidden [scrollbar-gutter:stable]">
        <div className="w-14 shrink-0" />
        <div className="grid flex-1" style={cols}>
          {days.map((d, i) => {
            const isToday = dayKeys[i] === todayKey;
            const isAnchor = n > 1 && dayKeys[i] === anchorKey && !isToday;
            return (
              <div
                key={dayKeys[i]}
                className={cn("flex flex-col gap-0.5 pt-2 pb-1", n === 1 ? "items-start pl-2" : "items-center")}
              >
                <span className={cn("text-[11px] font-medium uppercase", isToday ? "text-primary" : "text-muted-foreground")}>
                  {format(d, "EEE")}
                </span>
                <button
                  type="button"
                  aria-label={format(d, "EEEE, MMMM d")}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => go("day", d)}
                  className={cn(
                    "grid size-11 place-items-center rounded-full text-2xl tabular-nums",
                    isToday ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    isAnchor && "ring-2 ring-primary",
                  )}
                >
                  {format(d, "d")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <AllDayRow items={allDayItems} days={days} fmt={fmt} gmtLabel={gmtOffsetLabel(tz)} draftColor={draftColor} />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thin]">
        <div className="flex" style={{ height: 24 * HOUR_HEIGHT }}>
          <div className="relative w-14 shrink-0" aria-hidden>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <div key={h} className="absolute right-0 flex -translate-y-1/2 items-center" style={{ top: h * HOUR_HEIGHT }}>
                <span className="pr-2 text-[10px] text-muted-foreground">{hourLabel(h, fmt)}</span>
                <span className="w-2 border-t" />
              </div>
            ))}
          </div>
          <div ref={colsRef} className="grid flex-1 border-l" style={cols}>
            {dayKeys.map((k, i) => (
              <DayColumn
                key={k}
                col={i}
                dayKey={k}
                segments={segments[i]}
                nowMin={mounted && k === todayKey ? minutesOfDay(now) : null}
                fmt={fmt}
                draftColor={draftColor}
                draggingId={draggingId}
                h={handlers}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

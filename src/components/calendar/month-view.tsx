"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { layoutAllDay, type SpanPlacement } from "@/lib/calendar/allDayLayout";
import { dateKey, getVisibleRange, navigate } from "@/lib/calendar/dates";
import { keyDiffDays } from "@/lib/calendar/recurrence";
import { anchorFor, openDetail, openDraft, useUI, type Draft } from "@/lib/calendar/ui-store";
import { useCalendarItems, type CalItem } from "@/hooks/calendar/use-calendar-items";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { useSettings } from "@/hooks/calendar/use-calendar-settings";
import { useEventMutations } from "@/hooks/calendar/use-event-mutations";
import { cellPoint, startPointerDrag } from "@/hooks/calendar/use-drag";
import { useNow } from "@/hooks/calendar/use-now";
import { AllDayBar, ItemChip } from "./parts";

const LANE = 24;
const CHIP = 28; // date chip row
const WEEKDAY_LABEL = 14; // first row only
type Span = { item: CalItem; startDate: string; endDate: string };

export const itemsOnDay = (items: CalItem[], key: string) => items.filter((it) => it.startKey <= key && key < it.endKey);

/** Month grid: bars and chips packed into lanes per week, "N more" when a cell overflows. */
export function MonthView({ date }: { date: Date }) {
  const { weekStartsOn, showWeekends, timeFormat: fmt } = useSettings();
  const { go } = useCalendarRoute();
  const { shiftDays } = useEventMutations();
  const anchorKey = dateKey(date);
  const range = useMemo(
    () => getVisibleRange("month", date, weekStartsOn, showWeekends),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchorKey, weekStartsOn, showWeekends],
  );
  const neighbours = useMemo(
    () => [-1, 1].map((d) => getVisibleRange("month", navigate("month", date, d as 1 | -1), weekStartsOn, showWeekends)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchorKey, weekStartsOn, showWeekends],
  );
  const { items, isLoading } = useCalendarItems(range, neighbours);
  const draft = useUI((s) => (s.draft?.isAllDay ? s.draft : null));
  const todayKey = dateKey(useNow());
  const gridRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(120);
  const [dragging, setDragging] = useState<string | null>(null);

  const cols = showWeekends ? 7 : 5;
  const days = range.days;
  const keys = useMemo(() => days.map(dateKey), [days]);
  const weeks = useMemo(() => Array.from({ length: days.length / cols }, (_, w) => keys.slice(w * cols, (w + 1) * cols)), [keys, cols, days.length]);
  const month = date.getMonth();

  // All-day and multi-day items first, then by start, so bars claim the top lanes.
  const spans = useMemo<Span[]>(
    () =>
      [...items]
        .sort((a, b) => Number(b.inAllDayRow) - Number(a.inAllDayRow) || a.fStart.getTime() - b.fStart.getTime())
        .map((item) => ({ item, startDate: item.startKey, endDate: item.endKey })),
    [items],
  );
  const placementsByWeek = useMemo(() => weeks.map((w) => layoutAllDay(spans, w)), [spans, weeks]);

  useLayoutEffect(() => {
    const el = gridRef.current!;
    const ro = new ResizeObserver(() => setRowHeight(el.clientHeight / Math.max(1, weeks.length)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [weeks.length]);

  const draftFor = (a: number, b: number): Draft => ({
    start: days[Math.min(a, b)],
    end: addDays(days[Math.max(a, b)], 1),
    isAllDay: true,
  });
  const draftStart = draft ? dateKey(draft.start) : "";
  const draftEnd = draft ? dateKey(draft.end) : "";

  // Empty cell: click for an all-day draft, drag across cells for a longer one.
  const onGridDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !(e.target as HTMLElement).dataset.cell || useUI.getState().popover) return;
    const grid = e.currentTarget;
    const at = (ev: { clientX: number; clientY: number }) => cellPoint(ev, grid, weeks.length, cols).index;
    const down = at(e);
    let cur = down;
    const { set } = useUI.getState();
    startPointerDrag(e, {
      onStart: () => set({ draft: draftFor(down, down) }),
      onMove: (ev) => {
        const i = at(ev);
        if (i !== cur) set({ draft: draftFor(down, (cur = i)) });
      },
      onEnd: () => openDraft(draftFor(down, cur), grid),
      onClick: () => openDraft(draftFor(down, down), grid),
      onCancel: () => set({ draft: null }),
    });
  };

  // Items move between cells, keeping their times.
  const onItemDown = (e: React.PointerEvent<HTMLButtonElement>, item: CalItem) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = e.currentTarget;
    if (item.readOnly) return startPointerDrag(e, { onClick: () => openDetail(item, el) });
    const grid = gridRef.current!;
    const cellAt = (ev: { clientX: number; clientY: number }) => cellPoint(ev, grid, weeks.length, cols).index;
    const down = cellAt(e);
    let target = down;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    let ghost: HTMLElement | null = null;
    let outlined: HTMLElement | null = null;
    const outline = (i: number) => {
      outlined?.classList.remove("outline-2", "outline-primary", "-outline-offset-2");
      outlined = grid.querySelector<HTMLElement>(`[data-cell="${keys[i]}"]`);
      outlined?.classList.add("outline-2", "outline-primary", "-outline-offset-2");
    };
    const cleanup = () => {
      ghost?.remove();
      outline(-1);
      setDragging(null);
    };
    startPointerDrag(e, {
      onStart: () => {
        ghost = el.cloneNode(true) as HTMLElement;
        Object.assign(ghost.style, {
          position: "fixed",
          left: "0",
          top: "0",
          width: `${rect.width}px`,
          zIndex: "60",
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgb(0 0 0 / 0.25)",
        });
        document.body.appendChild(ghost);
        setDragging(item.occurrenceId);
      },
      onMove: (ev) => {
        ghost!.style.transform = `translate(${ev.clientX - dx}px, ${ev.clientY - dy}px)`;
        target = cellAt(ev);
        outline(target);
      },
      onEnd: () => {
        cleanup();
        if (target !== down) shiftDays(item, keyDiffDays(keys[down], keys[target]));
      },
      onClick: () => {
        cleanup();
        openDetail(item, el);
      },
      onCancel: cleanup,
    });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {isLoading && <div className="absolute inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary" />}
      <div
        ref={gridRef}
        role="group"
        aria-label={format(date, "MMMM yyyy")}
        onPointerDown={onGridDown}
        className="grid min-h-0 flex-1 border-l"
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((week, w) => {
          const top = CHIP + (w === 0 ? WEEKDAY_LABEL : 0);
          const capacity = Math.max(1, Math.floor((rowHeight - top - 4) / LANE));
          const placements = placementsByWeek[w];
          const used = week.map((_, c) =>
            placements.reduce((m, p) => (p.startCol <= c && c < p.startCol + p.span ? Math.max(m, p.lane + 1) : m), 0),
          );
          const covers = (p: SpanPlacement<Span>, c: number) => p.startCol <= c && c < p.startCol + p.span;
          const visible = (p: SpanPlacement<Span>) =>
            p.lane < capacity - 1 ||
            (p.lane === capacity - 1 && week.every((_, c) => !covers(p, c) || used[c] <= capacity));
          return (
            <div key={week[0]} className="relative grid border-b" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {week.map((k, c) => {
                const d = days[w * cols + c];
                const isToday = k === todayKey;
                const inDraft = !!draft && draftStart <= k && k < draftEnd;
                return (
                  <div
                    key={k}
                    data-cell={k}
                    data-draft={inDraft && k === draftStart ? "" : undefined}
                    className={cn("flex flex-col items-center border-r pt-1", inDraft && "bg-primary/10")}
                  >
                    {w === 0 && (
                      <span className="pointer-events-none text-[11px] leading-[14px] font-medium text-muted-foreground uppercase">
                        {format(d, "EEE")}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={format(d, "EEEE, MMMM d")}
                      aria-current={isToday ? "date" : undefined}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => go("day", d)}
                      className={cn(
                        "h-6 min-w-6 rounded-full px-1.5 text-xs font-medium tabular-nums",
                        isToday ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                        d.getMonth() !== month && !isToday && "text-muted-foreground",
                      )}
                    >
                      {d.getDate() === 1 ? format(d, "MMM d") : d.getDate()}
                    </button>
                  </div>
                );
              })}
              <div className="pointer-events-none absolute inset-x-0" style={{ top }}>
                {placements.filter(visible).map((p) => {
                  const it = p.occurrence.item;
                  const style = {
                    top: p.lane * LANE,
                    left: `calc(${(p.startCol / cols) * 100}% + 2px)`,
                    width: `calc(${(p.span / cols) * 100}% - 6px)`,
                  };
                  const props = {
                    item: it,
                    fmt,
                    className: cn("pointer-events-auto", dragging === it.occurrenceId && "opacity-40"),
                    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => onItemDown(e, it),
                    onClick: (e: React.MouseEvent<HTMLButtonElement>) => e.detail === 0 && openDetail(it, e.currentTarget),
                  };
                  return (
                    <div key={it.occurrenceId} className="absolute" style={style}>
                      {p.span === 1 && !it.inAllDayRow ? (
                        <ItemChip {...props} />
                      ) : (
                        <AllDayBar {...props} continuesBefore={p.continuesBefore} continuesAfter={p.continuesAfter} />
                      )}
                    </div>
                  );
                })}
                {week.map((k, c) => {
                  if (used[c] <= capacity) return null;
                  const hidden = placements.filter((p) => covers(p, c) && !visible(p)).length;
                  return (
                    <button
                      key={k}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) =>
                        useUI.getState().set({
                          popover: { kind: "day", anchor: anchorFor(e.currentTarget), date: days[w * cols + c], items: itemsOnDay(items, k) },
                        })
                      }
                      className="pointer-events-auto absolute h-[22px] truncate rounded-[4px] px-2 text-left text-xs font-medium hover:bg-muted"
                      style={{ top: (capacity - 1) * LANE, left: `calc(${(c / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 6px)` }}
                    >
                      {hidden} more
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { addDays } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { layoutAllDay } from "@/lib/calendar/allDayLayout";
import { dateKey, type TimeFormatKey } from "@/lib/calendar/dates";
import { keyDiffDays } from "@/lib/calendar/recurrence";
import { openDetail, openDraft, useUI, type Draft } from "@/lib/calendar/ui-store";
import type { CalItem } from "@/hooks/calendar/use-calendar-items";
import { useEventMutations } from "@/hooks/calendar/use-event-mutations";
import { cellPoint, startPointerDrag } from "@/hooks/calendar/use-drag";
import { AllDayBar, IconButton } from "./parts";

const LANE = 24;

/** The all-day strip above the time grid: bars packed into lanes, draggable between days. */
export function AllDayRow({
  items,
  days,
  fmt,
  gmtLabel,
  draftColor,
}: {
  items: CalItem[];
  days: Date[];
  fmt: TimeFormatKey;
  gmtLabel: string;
  draftColor: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const draft = useUI((s) => s.draft);
  const draftTitle = useUI((s) => s.draftTitle);
  const { shiftDays } = useEventMutations();
  const n = days.length;
  const dayKeys = useMemo(() => days.map(dateKey), [days]);

  const placements = useMemo(
    () => layoutAllDay(items.map((item) => ({ item, startDate: item.startKey, endDate: item.endKey })), dayKeys),
    [items, dayKeys],
  );
  const laneCount = placements.reduce((m, p) => Math.max(m, p.lane + 1), 0);
  // More than 3 lanes collapse to 2 plus a "N more" lane.
  const collapsed = laneCount > 3 && !expanded;
  const shownLanes = collapsed ? 3 : laneCount;
  const draftPlacement = draft?.isAllDay
    ? layoutAllDay([{ startDate: dateKey(draft.start), endDate: dateKey(draft.end) }], dayKeys)[0]
    : undefined;
  const lanes = Math.max(1, shownLanes + (draftPlacement ? 1 : 0));
  const hiddenIn = (col: number) =>
    placements.filter((p) => p.lane >= 2 && p.startCol <= col && col < p.startCol + p.span).length;

  const draftFor = (a: number, b: number): Draft => ({
    start: days[Math.min(a, b)],
    end: addDays(days[Math.max(a, b)], 1),
    isAllDay: true,
  });

  // Click an empty spot for a one-day draft; drag across days for a longer one.
  const onRowDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget || useUI.getState().popover) return;
    const el = e.currentTarget;
    const { col: downCol } = cellPoint(e, el, 1, n);
    let cur = downCol;
    const { set } = useUI.getState();
    startPointerDrag(e, {
      onStart: () => set({ draft: draftFor(downCol, downCol) }),
      onMove: (ev) => {
        const { col } = cellPoint(ev, el, 1, n);
        if (col !== cur) set({ draft: draftFor(downCol, (cur = col)) });
      },
      onEnd: () => openDraft(draftFor(downCol, cur), el),
      onClick: () => openDraft(draftFor(downCol, downCol), el),
      onCancel: () => set({ draft: null }),
    });
  };

  // Bars drag sideways by whole visible days.
  const onBarDown = (e: React.PointerEvent<HTMLButtonElement>, item: CalItem) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const bar = e.currentTarget;
    const row = rowRef.current!;
    if (item.readOnly) return startPointerDrag(e, { onClick: () => openDetail(item, bar) });
    const { col: downCol } = cellPoint(e, row, 1, n);
    let target = downCol;
    let ghost: HTMLElement | null = null;
    const cleanup = () => {
      ghost?.remove();
      setDragging(null);
    };
    startPointerDrag(e, {
      onStart: () => {
        ghost = bar.cloneNode(true) as HTMLElement;
        ghost.style.pointerEvents = "none";
        ghost.style.zIndex = "30";
        ghost.style.boxShadow = "0 4px 12px rgb(0 0 0 / 0.25)";
        bar.parentElement!.appendChild(ghost);
        setDragging(item.occurrenceId);
      },
      onMove: (ev) => {
        target = cellPoint(ev, row, 1, n).col;
        ghost!.style.transform = `translateX(${((target - downCol) * row.clientWidth) / n}px)`;
      },
      onEnd: () => {
        cleanup();
        if (target !== downCol) shiftDays(item, keyDiffDays(dayKeys[downCol], dayKeys[target]));
      },
      onClick: () => openDetail(item, bar),
      onCancel: cleanup,
    });
  };

  const box = (startCol: number, span: number, lane: number): React.CSSProperties => ({
    top: lane * LANE + 1,
    left: `calc(${(startCol / n) * 100}% + 1px)`,
    width: `calc(${(span / n) * 100}% - 6px)`,
  });

  return (
    <div className="flex shrink-0 overflow-y-hidden border-b [scrollbar-gutter:stable]">
      <div className="relative flex w-14 shrink-0 flex-col items-end justify-end px-1 pb-1 text-[9px] text-muted-foreground">
        {laneCount > 3 && (
          <IconButton
            label={expanded ? "Collapse all-day events" : "Expand all-day events"}
            size="icon-xs"
            className="absolute top-0.5 left-2"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
          </IconButton>
        )}
        {gmtLabel}
      </div>
      <div
        ref={rowRef}
        role="group"
        aria-label="All-day events"
        onPointerDown={onRowDown}
        className="relative flex-1 border-l"
        style={{ height: lanes * LANE + 4 }}
      >
        <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {dayKeys.map((k, i) => (
            <div key={k} className={cn(i > 0 && "border-l")} />
          ))}
        </div>
        {placements.map((p) =>
          collapsed && p.lane >= 2 ? null : (
            <div key={p.occurrence.item.occurrenceId} className="absolute" style={box(p.startCol, p.span, p.lane)}>
              <AllDayBar
                item={p.occurrence.item}
                fmt={fmt}
                continuesBefore={p.continuesBefore}
                continuesAfter={p.continuesAfter}
                className={cn(dragging === p.occurrence.item.occurrenceId && "opacity-40")}
                onPointerDown={(e) => onBarDown(e, p.occurrence.item)}
                onClick={(e) => e.detail === 0 && openDetail(p.occurrence.item, e.currentTarget)}
              />
            </div>
          ),
        )}
        {collapsed &&
          dayKeys.map((k, col) => {
            const hidden = hiddenIn(col);
            return hidden ? (
              <button
                key={k}
                type="button"
                onClick={() => setExpanded(true)}
                className="absolute h-[22px] truncate rounded-[4px] px-2 text-left text-xs font-medium hover:bg-muted"
                style={box(col, 1, 2)}
              >
                {hidden} more
              </button>
            ) : null;
          })}
        {draftPlacement && (
          <div
            data-draft
            className="pointer-events-none absolute flex h-[22px] items-center truncate rounded-[4px] px-2 text-xs font-semibold text-white shadow-md"
            style={{ ...box(draftPlacement.startCol, draftPlacement.span, shownLanes), backgroundColor: draftColor }}
          >
            {draftTitle || "(No title)"}
          </div>
        )}
      </div>
    </div>
  );
}

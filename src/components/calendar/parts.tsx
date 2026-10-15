"use client";

import type { ComponentProps } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTime, type TimeFormatKey } from "@/lib/calendar/dates";
import { itemAriaLabel, itemStyle, type CalItem } from "@/hooks/calendar/use-calendar-items";

/** A round icon-only button with its label as tooltip and accessible name. */
export function IconButton({ label, className, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      title={label}
      aria-label={label}
      className={cn("rounded-full", className)}
      {...props}
    />
  );
}

/** Colour circles; a `null` entry ("Calendar color") is drawn in `nullColor`. */
export function ColorSwatches({
  colors,
  value,
  onPick,
  nullColor,
}: {
  colors: readonly { name: string; hex: string | null }[];
  value: string | null;
  onPick: (hex: string | null) => void;
  nullColor?: string;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 p-1">
      {colors.map((c) => {
        const selected = (c.hex ?? null) === (value ?? null);
        return (
          <button
            key={c.name}
            type="button"
            title={c.name}
            aria-label={c.name}
            aria-pressed={selected}
            onClick={() => onPick(c.hex)}
            className="grid size-6 place-items-center rounded-full ring-offset-1 ring-offset-popover hover:ring-2 hover:ring-border"
            style={{ backgroundColor: c.hex ?? nullColor }}
          >
            {selected && <Check className="size-3.5 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

const ARROW = 6;
/** Arrow-shaped ends for bars that continue past the visible days. */
function arrowClip(before: boolean, after: boolean) {
  if (!before && !after) return undefined;
  const l = before ? `${ARROW}px` : "0";
  const r = after ? `calc(100% - ${ARROW}px)` : "100%";
  return `polygon(${l} 0, ${r} 0, ${after ? "100% 50%," : ""} ${r} 100%, ${l} 100% ${before ? ", 0 50%" : ""})`;
}

type BarProps = Omit<ComponentProps<"button">, "children"> & {
  item: CalItem;
  fmt: TimeFormatKey;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
};

/** An all-day (or multi-day) item as a solid bar. */
export function AllDayBar({ item, fmt, continuesBefore, continuesAfter, className, style, ...props }: BarProps) {
  return (
    <button
      type="button"
      aria-label={itemAriaLabel(item, fmt)}
      className={cn(
        "flex h-[22px] w-full items-center truncate rounded-[4px] px-2 text-left text-xs font-semibold",
        continuesBefore && "pl-3",
        continuesAfter && "pr-3",
        className,
      )}
      style={{ ...itemStyle(item), clipPath: arrowClip(!!continuesBefore, !!continuesAfter), ...style }}
      {...props}
    >
      <span className="truncate">
        {!item.isAllDay && <span className="mr-1 font-normal">{formatTime(item.fStart, fmt)}</span>}
        {item.title}
      </span>
    </button>
  );
}

/** "● 3pm Title" — a timed item in month cells and day lists; all-day items stay solid bars. */
export function ItemChip({ item, fmt, className, ...props }: BarProps) {
  if (item.inAllDayRow) return <AllDayBar item={item} fmt={fmt} className={className} {...props} />;
  return (
    <button
      type="button"
      aria-label={itemAriaLabel(item, fmt)}
      className={cn(
        "flex h-[22px] w-full items-center gap-1.5 truncate rounded-[4px] px-1.5 text-left text-xs hover:bg-muted",
        className,
      )}
      {...props}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.displayColor }} />
      <span className="shrink-0 text-muted-foreground">{formatTime(item.fStart, fmt)}</span>
      <span className="truncate font-medium">{item.title}</span>
    </button>
  );
}

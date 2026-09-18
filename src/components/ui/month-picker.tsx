"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A month held as yyyy-MM, matching `CalcMonth` and `PayRate.effectiveFrom`.
function toKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function parseKey(value: string): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month: month - 1 };
}

function shift(value: string, months: number): string {
  const { year, month } = parseKey(value);
  const date = new Date(year, month + months, 1);
  return toKey(date.getFullYear(), date.getMonth());
}

export function formatMonthKey(value: string): string {
  const { year, month } = parseKey(value);
  return `${FULL_MONTH_NAMES[month]} ${year}`;
}

interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  // Inclusive bounds, as yyyy-MM. Outside them the arrows stop and the grid
  // greys out — a month before you joined has no rate to calculate against.
  min?: string;
  max?: string;
  className?: string;
}

export function MonthPicker({ value, onChange, min, max, className }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  // The year the grid is showing, which is not always the selected one — you
  // can page back through years without picking anything.
  const [shownYear, setShownYear] = useState(() => parseKey(value).year);

  const selected = parseKey(value);
  const inRange = (key: string) => (!min || key >= min) && (!max || key <= max);

  const previous = shift(value, -1);
  const next = shift(value, 1);

  const pick = (month: number) => {
    onChange(toKey(shownYear, month));
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!inRange(previous)}
        onClick={() => onChange(previous)}
      >
        <ChevronLeft className="size-4" />
        <span className="sr-only">Previous month</span>
      </Button>

      <Popover
        open={open}
        onOpenChange={(opening) => {
          // Reopening always lands on the selected month's year, never on
          // whichever year was last paged to.
          if (opening) setShownYear(selected.year);
          setOpen(opening);
        }}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="flex-1 justify-center font-normal">
            {formatMonthKey(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="center">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!!min && toKey(shownYear - 1, 11) < min}
              onClick={() => setShownYear((year) => year - 1)}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous year</span>
            </Button>
            <span className="text-sm font-medium tabular-nums">{shownYear}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!!max && toKey(shownYear + 1, 0) > max}
              onClick={() => setShownYear((year) => year + 1)}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next year</span>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTH_NAMES.map((name, month) => {
              const key = toKey(shownYear, month);
              const isSelected = key === value;
              return (
                <Button
                  key={name}
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  disabled={!inRange(key)}
                  onClick={() => pick(month)}
                  className="justify-center"
                >
                  {name}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!inRange(next)}
        onClick={() => onChange(next)}
      >
        <ChevronRight className="size-4" />
        <span className="sr-only">Next month</span>
      </Button>
    </div>
  );
}

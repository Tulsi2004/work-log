"use client";

import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// The value on the wire stays "yyyy-MM-dd" — what every form schema and query
// string here already speaks. Only what the user reads changes.
const VALUE_FORMAT = "yyyy-MM-dd";

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  // Parsed as local time: `new Date("2026-09-18")` is UTC midnight, which is the
  // day before in any negative offset.
  const parsed = parse(value, VALUE_FORMAT, new Date());
  return isValid(parsed) ? parsed : undefined;
}

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-full min-w-0 justify-start gap-2 px-2.5 font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{selected ? format(selected, "MMM d, yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          autoFocus
          onSelect={(date) => {
            onChange(date ? format(date, VALUE_FORMAT) : "");
            setOpen(false);
          }}
        />
        {/* Filters and optional dates both need a way back to "no date". */}
        {selected && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <X className="size-4" />
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

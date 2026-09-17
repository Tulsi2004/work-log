"use client";

import type * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/hooks/use-table-sort";

interface SortableTableHeadProps extends Omit<React.ComponentProps<typeof TableHead>, "onClick"> {
  /** The way this column is sorted right now, or null when the table is sorted by another one. */
  direction: SortDirection | null;
  onSort: () => void;
  align?: "left" | "right";
}

/** A column header that cycles ascending → descending → unsorted when clicked. */
export function SortableTableHead({
  direction,
  onSort,
  align = "left",
  className,
  children,
  ...props
}: SortableTableHeadProps) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <TableHead
      aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}
      className={cn("p-0", className)}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "flex w-full items-center gap-1 px-2 py-2 text-left font-medium hover:text-foreground",
          align === "right" && "justify-end text-right"
        )}
      >
        <span>{children}</span>
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            direction ? "text-foreground" : "text-muted-foreground/50"
          )}
        />
      </button>
    </TableHead>
  );
}

"use client";

import { useState } from "react";

export type SortDirection = "asc" | "desc";

export type SortValue = string | number | boolean | null | undefined;

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

export type SortAccessors<T, K extends string> = Record<K, (row: T) => SortValue>;

function isBlank(value: SortValue): boolean {
  return value === null || value === undefined || value === "";
}

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === "boolean" || typeof b === "boolean") return Number(a) - Number(b);
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/**
 * Click-to-sort for a table's columns. Rows start in the order they arrive in;
 * the first click on a header sorts ascending, the second descending, the third
 * hands the rows back in their original order. Blanks always sit at the bottom,
 * whichever way round the column is sorted.
 */
export function useTableSort<T, K extends string>(rows: T[], accessors: SortAccessors<T, K>) {
  const [sort, setSort] = useState<SortState<K> | null>(null);

  const toggle = (key: K) =>
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" };
      return current.direction === "asc" ? { key, direction: "desc" } : null;
    });

  // A page of rows at most, so there is nothing to gain from memoising this.
  // The accessor can go missing if the column did — a custom field deleted
  // while the table was sorted by it — in which case the order just resets.
  const read = sort ? accessors[sort.key] : undefined;
  const factor = sort?.direction === "desc" ? -1 : 1;
  const sorted = read
    ? [...rows].sort((a, b) => {
        const left = read(a);
        const right = read(b);
        if (isBlank(left) || isBlank(right)) {
          return isBlank(left) && isBlank(right) ? 0 : isBlank(left) ? 1 : -1;
        }
        return factor * compare(left, right);
      })
    : rows;

  /** The direction a column is currently sorted by, or null when it is not the sorted one. */
  const directionOf = (key: K): SortDirection | null => (sort?.key === key ? sort.direction : null);

  return { sorted, sort, toggle, directionOf };
}

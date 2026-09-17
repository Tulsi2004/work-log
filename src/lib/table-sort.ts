import type { CustomField } from "@prisma/client";
import type { SortValue } from "@/hooks/use-table-sort";

/**
 * Custom values are all stored as text, so a NUMBER field would otherwise sort
 * "100" before "9". Read the type back out before handing the value to a sort.
 */
export function customSortValue(field: CustomField, value?: string | null): SortValue {
  if (value === undefined || value === null || value === "") return null;
  if (field.type === "NUMBER") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  if (field.type === "CHECKBOX") return value === "true";
  return value;
}

import type { CustomField } from "@prisma/client";

export const CUSTOM_FIELD_ENTITIES = ["WORK_REPORT", "EMPLOYMENT", "DAY_PLAN"] as const;
export const CUSTOM_FIELD_TYPES = [
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "DATE",
  "CHECKBOX",
  "SELECT",
] as const;

export type CustomFieldEntityValue = (typeof CUSTOM_FIELD_ENTITIES)[number];
export type CustomFieldTypeValue = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_ENTITY_LABELS: Record<CustomFieldEntityValue, string> = {
  WORK_REPORT: "Work reports",
  EMPLOYMENT: "Companies",
  DAY_PLAN: "Planner to-dos",
};

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldTypeValue, string> = {
  TEXT: "Text",
  LONG_TEXT: "Long text",
  NUMBER: "Number",
  DATE: "Date",
  CHECKBOX: "Yes / No",
  SELECT: "Dropdown",
};

// Values are stored as text whatever the type, so a field's type can change
// later without rewriting rows. These two helpers are the only place that knows.
export type CustomValues = Record<string, string>;

export function selectOptions(field: Pick<CustomField, "options">): string[] {
  const options = field.options as unknown;
  if (!Array.isArray(options)) return [];
  return options.filter((option): option is string => typeof option === "string");
}

export function emptyCustomValues(fields: CustomField[]): CustomValues {
  return Object.fromEntries(fields.map((field) => [field.id, field.type === "CHECKBOX" ? "false" : ""]));
}

// Merge stored values over the empty shape, so a field added after a record was
// created still renders (blank) instead of leaving react-hook-form undefined.
export function toFormCustomValues(fields: CustomField[], stored?: CustomValues | null): CustomValues {
  const base = emptyCustomValues(fields);
  if (!stored) return base;
  for (const field of fields) {
    const value = stored[field.id];
    if (value !== undefined) base[field.id] = value;
  }
  return base;
}

// How a value reads in a table cell or a filter chip.
export function formatCustomValue(field: CustomField, value?: string | null): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "CHECKBOX") return value === "true" ? "Yes" : "No";
  return value;
}

export function isBlankCustomValue(field: CustomField, value?: string | null): boolean {
  if (value === undefined || value === null || value === "") return true;
  // An unchecked box is a real answer, but showing "No" for every untouched
  // record is noise — treat it as blank for "does any record use this field".
  return field.type === "CHECKBOX" && value === "false";
}

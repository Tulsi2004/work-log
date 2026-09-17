import type { CustomFieldEntity } from "@prisma/client";
import { SPEND_CATEGORIES, spendCategoryName } from "@/lib/money";
import { DAY_TYPES, EMPLOYMENT_TYPES, PAYMENT_TYPES } from "@/lib/validations/work-report";
import { formatEnumLabel } from "@/utils/format";

// What a user-built card can be made of. The builder reads this to offer
// choices; the server reads the same thing to work out what a saved card meant,
// so the two can never drift apart.

export const CARD_SOURCES = ["workReport", "employment", "salaryEntry", "dayPlan"] as const;
export type CardSource = (typeof CARD_SOURCES)[number];

export const CARD_SOURCE_LABELS: Record<CardSource, string> = {
  workReport: "Work reports",
  employment: "Companies",
  salaryEntry: "Money entries",
  dayPlan: "Planner to-dos",
};

/** Each source carries its own custom fields, under the entity it was defined for. */
export const SOURCE_ENTITY: Record<CardSource, CustomFieldEntity> = {
  workReport: "WORK_REPORT",
  employment: "EMPLOYMENT",
  salaryEntry: "SALARY_ENTRY",
  dayPlan: "DAY_PLAN",
};

export const CARD_MEASURES = ["count", "sum", "average", "highest", "lowest"] as const;
export type CardMeasure = (typeof CARD_MEASURES)[number];

export const CARD_MEASURE_LABELS: Record<CardMeasure, string> = {
  count: "How many",
  sum: "Sum of",
  average: "Average of",
  highest: "Highest",
  lowest: "Lowest",
};

/** Every measure but a plain count needs a number to work on. */
export function measureNeedsField(measure: CardMeasure): boolean {
  return measure !== "count";
}

export const CARD_PERIODS = ["ALL", "THIS_MONTH", "THIS_YEAR", "LAST_30_DAYS"] as const;
export type CardPeriod = (typeof CARD_PERIODS)[number];

export const CARD_PERIOD_LABELS: Record<CardPeriod, string> = {
  ALL: "All time",
  THIS_MONTH: "This month",
  THIS_YEAR: "This year",
  LAST_30_DAYS: "Last 30 days",
};

export interface MeasureField {
  key: string;
  label: string;
  /** Rendered as currency rather than a bare number. */
  money?: boolean;
}

/** The built-in numbers each source can be measured on. Custom NUMBER fields join these. */
export const MEASURE_FIELDS: Record<CardSource, MeasureField[]> = {
  workReport: [{ key: "tasks", label: "Tasks logged" }],
  employment: [
    { key: "actualSalary", label: "Actual salary", money: true },
    { key: "inHandSalary", label: "In-hand salary", money: true },
    { key: "pf", label: "PF", money: true },
    { key: "payDay", label: "Pay day" },
  ],
  salaryEntry: [
    { key: "amount", label: "Received", money: true },
    { key: "spent", label: "Spent", money: true },
    { key: "saved", label: "Saved", money: true },
  ],
  dayPlan: [],
};

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  /**
   * "choice" picks from `options`. "company" and "planLabel" are filled in from
   * the user's own rows, so their choices are not known here.
   */
  kind: "choice" | "company" | "planLabel";
  options?: FilterOption[];
}

const YES_NO: FilterOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const enumOptions = (values: readonly string[]): FilterOption[] =>
  values.map((value) => ({ value, label: formatEnumLabel(value) }));

/** What a record can be narrowed by, per source. Custom fields join these too. */
export const FILTER_FIELDS: Record<CardSource, FilterField[]> = {
  workReport: [
    { key: "dayType", label: "Day type", kind: "choice", options: enumOptions(DAY_TYPES) },
    { key: "isLeave", label: "Leave", kind: "choice", options: YES_NO },
    { key: "isCompanyGranted", label: "Company leave", kind: "choice", options: YES_NO },
    { key: "hasMeeting", label: "Had a meeting", kind: "choice", options: YES_NO },
    { key: "hasNoTask", label: "No task logged", kind: "choice", options: YES_NO },
    { key: "employmentId", label: "Company", kind: "company" },
  ],
  employment: [
    { key: "employmentType", label: "Type", kind: "choice", options: enumOptions(EMPLOYMENT_TYPES) },
    { key: "paymentType", label: "Payment", kind: "choice", options: enumOptions(PAYMENT_TYPES) },
    {
      key: "status",
      label: "Status",
      kind: "choice",
      options: [
        { value: "current", label: "Current" },
        { value: "past", label: "Past" },
      ],
    },
  ],
  salaryEntry: [
    { key: "employmentId", label: "Company", kind: "company" },
    {
      key: "spendCategory",
      label: "Spend category",
      kind: "choice",
      options: SPEND_CATEGORIES.map((value) => ({ value, label: spendCategoryName(value) })),
    },
  ],
  dayPlan: [
    { key: "label", label: "Label", kind: "planLabel" },
    { key: "isDone", label: "Done", kind: "choice", options: YES_NO },
    { key: "employmentId", label: "Company", kind: "company" },
  ],
};

export interface CardFilter {
  field: string;
  value: string;
}

export interface CustomCardDefinition {
  title: string;
  source: CardSource;
  measure: CardMeasure;
  field?: string | null;
  period: CardPeriod;
  filters: CardFilter[];
}

/** A card the user built, with the number it currently works out to. */
export interface CustomCardValue extends CustomCardDefinition {
  id: string;
  /** Already formatted — money, a count, or "—" when there is nothing to measure. */
  display: string;
}

/**
 * Custom cards join the fixed catalogue under a prefix, so the existing "which
 * cards, in what order" preference stores them the same way as the built-ins.
 */
export const CUSTOM_CARD_PREFIX = "custom:";

export function customCardId(id: string): string {
  return `${CUSTOM_CARD_PREFIX}${id}`;
}

export function parseCustomCardId(cardId: string): string | undefined {
  return cardId.startsWith(CUSTOM_CARD_PREFIX)
    ? cardId.slice(CUSTOM_CARD_PREFIX.length)
    : undefined;
}

/** Reads a stored filters column back into something the builder can edit. */
export function readCardFilters(value: unknown): CardFilter[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { field, value: filterValue } = entry as Record<string, unknown>;
    if (typeof field !== "string" || typeof filterValue !== "string") return [];
    return [{ field, value: filterValue }];
  });
}

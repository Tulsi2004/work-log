import "server-only";

import { endOfMonth, endOfYear, startOfMonth, startOfYear, subDays } from "date-fns";
import type { CustomCard } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSpends, sumSaved, sumSpent, toMoney } from "@/lib/money";
import { currentPayRate, type PayRate } from "@/types";
import { formatMoney } from "@/utils/format";
import {
  MEASURE_FIELDS,
  measureNeedsField,
  readCardFilters,
  type CardFilter,
  type CardMeasure,
  type CardPeriod,
  type CardSource,
  type CustomCardValue,
} from "@/lib/custom-cards";

/**
 * Works out what each of a user's cards currently says.
 *
 * The rows are fetched and then measured in memory rather than aggregated in
 * SQL. Two of the numbers people want — a company's pay and an entry's spends —
 * live inside Json columns that SQL cannot sum, and the record counts here are
 * personal-scale, so one code path that handles every field beats two that
 * disagree at the edges.
 */

function periodRange(period: CardPeriod): { gte?: Date; lte?: Date } | undefined {
  const now = new Date();
  switch (period) {
    case "THIS_MONTH":
      return { gte: startOfMonth(now), lte: endOfMonth(now) };
    case "THIS_YEAR":
      return { gte: startOfYear(now), lte: endOfYear(now) };
    case "LAST_30_DAYS":
      return { gte: subDays(now, 30), lte: now };
    default:
      return undefined;
  }
}

/** Which column dates a record, for the period filter. */
const DATE_FIELD: Record<CardSource, string> = {
  workReport: "date",
  employment: "since",
  salaryEntry: "date",
  dayPlan: "date",
};

type Row = Record<string, unknown> & { id: string };

async function fetchRows(userId: string, source: CardSource, period: CardPeriod): Promise<Row[]> {
  const range = periodRange(period);
  const dated = range ? { [DATE_FIELD[source]]: range } : {};

  switch (source) {
    case "workReport":
      return prisma.workReport.findMany({ where: { userId, ...dated } }) as Promise<Row[]>;
    case "dayPlan":
      return prisma.dayPlan.findMany({ where: { userId, ...dated } }) as Promise<Row[]>;
    case "salaryEntry":
      return prisma.salaryEntry.findMany({ where: { userId, ...dated } }) as Promise<Row[]>;
    case "employment":
      // Employments hang off a company rather than carrying the user themselves.
      return prisma.employment.findMany({ where: { company: { userId }, ...dated } }) as Promise<Row[]>;
  }
}

function isCurrentEmployment(row: Row): boolean {
  const until = row.until as Date | null;
  return !until || new Date(until) >= new Date();
}

/** Whether one record satisfies one condition. Unknown fields match nothing. */
function matches(source: CardSource, row: Row, filter: CardFilter): boolean {
  // A day marked as leave keeps whatever day type it had before, so a plain
  // column comparison would count leave as office. The tables show a Leave badge
  // in place of the day type for exactly the same reason.
  if (source === "workReport" && filter.field === "dayType" && row.isLeave === true) {
    return false;
  }
  if (source === "employment" && filter.field === "status") {
    return isCurrentEmployment(row) === (filter.value === "current");
  }
  if (source === "salaryEntry" && filter.field === "spendCategory") {
    return parseSpends(row.spends).some((spend) => spend.category === filter.value);
  }

  const actual = row[filter.field];
  if (actual === null || actual === undefined) return false;
  if (typeof actual === "boolean") return String(actual) === filter.value;
  return String(actual) === filter.value;
}

/** The number one record contributes, or undefined when it has none to give. */
function valueOf(source: CardSource, row: Row, field: string): number | undefined {
  if (source === "workReport" && field === "tasks") {
    return Array.isArray(row.tasks) ? row.tasks.length : 0;
  }

  if (source === "employment") {
    if (field === "payDay") {
      return typeof row.payDay === "number" ? row.payDay : undefined;
    }
    // Pay is a revision history; the rate in force is the one on the card.
    const pay = currentPayRate(row.payHistory as PayRate[] | null);
    if (!pay) return undefined;
    if (field === "actualSalary") return pay.actualSalary;
    if (field === "inHandSalary") return pay.inHandSalary;
    if (field === "pf") return pay.pf;
    return undefined;
  }

  if (source === "salaryEntry") {
    if (field === "amount") return toMoney(row.amount);
    const spends = parseSpends(row.spends);
    if (field === "spent") return sumSpent(spends);
    if (field === "saved") return sumSaved(spends);
    return undefined;
  }

  return undefined;
}

function aggregate(measure: CardMeasure, values: number[]): number | undefined {
  if (measure === "count") return values.length;
  if (values.length === 0) return undefined;
  switch (measure) {
    case "sum":
      return values.reduce((total, value) => total + value, 0);
    case "average":
      return values.reduce((total, value) => total + value, 0) / values.length;
    case "highest":
      return Math.max(...values);
    case "lowest":
      return Math.min(...values);
  }
}

/** A count reads as a whole number; money keeps its symbol; an average rounds. */
function display(measure: CardMeasure, result: number | undefined, money: boolean): string {
  if (result === undefined) return "—";
  if (measure === "count") return String(result);
  if (money) return formatMoney(Math.round(result * 100) / 100);
  return String(Math.round(result * 100) / 100);
}

export async function computeCustomCards(
  userId: string,
  cards: CustomCard[]
): Promise<CustomCardValue[]> {
  if (cards.length === 0) return [];

  const sources = new Set(cards.map((card) => card.source as CardSource));
  const periods = new Set(cards.map((card) => card.period as CardPeriod));

  // One fetch per source-and-period the cards actually ask for, shared between
  // every card that asks for the same thing.
  const rowsByKey = new Map<string, Row[]>();
  for (const source of sources) {
    for (const period of periods) {
      rowsByKey.set(`${source}:${period}`, await fetchRows(userId, source, period));
    }
  }

  // A card can measure or filter on a custom field, whose values are text on
  // rows of their own. Anything named in a card that turns out to be one of the
  // user's fields is looked up here, once, rather than per card.
  const named = new Set<string>();
  for (const card of cards) {
    if (card.field) named.add(card.field);
    for (const filter of readCardFilters(card.filters)) named.add(filter.field);
  }

  const customFields = named.size
    ? await prisma.customField.findMany({
        where: { userId, id: { in: [...named] } },
        select: { id: true, entity: true },
      })
    : [];
  const customFieldIds = new Set(customFields.map((field) => field.id));

  // recordId -> fieldId -> value. Record ids are unique across entities, so one
  // map serves every source.
  const customValues = new Map<string, Map<string, string>>();
  if (customFields.length > 0) {
    const rows = await prisma.customFieldValue.findMany({
      where: { userId, fieldId: { in: customFields.map((field) => field.id) } },
      select: { fieldId: true, recordId: true, value: true },
    });
    for (const row of rows) {
      const byField = customValues.get(row.recordId) ?? new Map<string, string>();
      byField.set(row.fieldId, row.value ?? "");
      customValues.set(row.recordId, byField);
    }
  }

  const customValueOf = (recordId: string, fieldId: string) =>
    customValues.get(recordId)?.get(fieldId) ?? "";

  return cards.map((card) => {
    const source = card.source as CardSource;
    const measure = card.measure as CardMeasure;
    const filters = readCardFilters(card.filters);
    const rows = rowsByKey.get(`${source}:${card.period}`) ?? [];

    const kept = rows.filter((row) =>
      filters.every((filter) =>
        customFieldIds.has(filter.field)
          ? customValueOf(row.id, filter.field) === filter.value
          : matches(source, row, filter)
      )
    );

    if (!measureNeedsField(measure)) {
      return {
        id: card.id,
        title: card.title,
        source,
        measure,
        field: card.field,
        period: card.period as CardPeriod,
        filters,
        display: String(kept.length),
      };
    }

    const field = card.field!;
    const builtIn = MEASURE_FIELDS[source].find((entry) => entry.key === field);
    const values = kept.flatMap((row) => {
      const value = customFieldIds.has(field)
        ? Number(customValueOf(row.id, field) || NaN)
        : valueOf(source, row, field);
      // A record with nothing in that field sits the measure out, rather than
      // dragging an average down with a zero it never had.
      return value === undefined || Number.isNaN(value) ? [] : [value];
    });

    return {
      id: card.id,
      title: card.title,
      source,
      measure,
      field: card.field,
      period: card.period as CardPeriod,
      filters,
      display: display(measure, aggregate(measure, values), !!builtIn?.money),
    };
  });
}

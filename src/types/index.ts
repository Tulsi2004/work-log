import type {
  Company,
  Employment,
  WorkReport,
  DayPlan,
  SalaryEntry,
  CustomField,
  PaymentType,
  DayType,
  PlanLabel,
} from "@prisma/client";
import { format } from "date-fns";
import type { CustomValues } from "@/lib/custom-fields";
import type { SalarySpend } from "@/lib/money";

export type { Company, Employment, WorkReport, DayPlan, SalaryEntry, CustomField, PaymentType, DayType, PlanLabel };

// Records that come back from an endpoint carry the user's own field values
// alongside the built-in columns. A nested `employment` does not — only the
// records the endpoint was asked for.
export type WithCustomValues<T> = T & { customValues: CustomValues };

export interface WorkReportTask {
  task: string;
  projectName?: string;
  assignedBy?: string;
}

export interface PayRate {
  actualSalary: number;
  pf: number;
  inHandSalary: number;
  effectiveFrom: string;
}

export type EmploymentWithCompany = Employment & { company: Company };

export type EmploymentListItem = WithCustomValues<EmploymentWithCompany>;

export type WorkReportWithEmployment = WithCustomValues<WorkReport & { employment: EmploymentWithCompany }>;

export type DayPlanWithEmployment = WithCustomValues<DayPlan & { employment: EmploymentWithCompany | null }>;

export type { SalarySpend };

// What an endpoint hands back for a money entry: `amount` as a plain number
// rather than a Prisma Decimal, and `spends` parsed out of the Json column.
export type SalaryEntryRecord = Omit<SalaryEntry, "amount" | "spends"> & {
  amount: number;
  spends: SalarySpend[];
};

export type SalaryEntryWithEmployment = WithCustomValues<
  SalaryEntryRecord & { employment: EmploymentWithCompany | null }
>;

// The rate in force on a given day (yyyy-MM-dd) — a hike applies from its own
// `effectiveFrom`, so money received in March is worth March's rate, not today's.
export function payRateOn(payHistory: unknown, day: string): PayRate | undefined {
  const rates = (payHistory as PayRate[] | null) ?? [];
  if (!rates.length) return undefined;
  const due = rates.filter((r) => r.effectiveFrom <= day);
  return (due.length ? due : rates).reduce((latest, r) => (r.effectiveFrom > latest.effectiveFrom ? r : latest));
}

export function currentPayRate(payHistory: unknown): PayRate | undefined {
  return payRateOn(payHistory, new Date().toISOString().slice(0, 10));
}

// The most recent day the pay would have landed, as yyyy-MM-dd — this month's
// pay day if it has passed, otherwise last month's. A pay day past the end of a
// short month falls on that month's last day.
export function lastPayDate(payDay?: number | null, today = new Date()): string | undefined {
  if (!payDay || payDay < 1 || payDay > 31) return undefined;

  const onMonth = (year: number, month: number) => {
    // Day 0 of the next month is the last day of this one.
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(payDay, daysInMonth));
  };

  const thisMonth = onMonth(today.getFullYear(), today.getMonth());
  const due =
    thisMonth <= today ? thisMonth : onMonth(today.getFullYear(), today.getMonth() - 1);
  return format(due, "yyyy-MM-dd");
}

// The stint you are actually in right now: one with no end date, or whose end
// date has not passed yet. `listEmployments` sorts by company name, so the first
// row is only ever alphabetical — never assume it is the current one.
export function currentEmployment(
  employments: EmploymentWithCompany[] | undefined
): EmploymentWithCompany | undefined {
  if (!employments?.length) return undefined;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const time = (date: Date | string | null) => (date ? new Date(date).getTime() : undefined);

  const ongoing = employments.filter((e) => {
    const until = time(e.until);
    return until === undefined || until >= startOfToday.getTime();
  });

  // Among ongoing stints, the one started most recently is the one you are in.
  if (ongoing.length) {
    return ongoing.reduce((latest, e) => ((time(e.since) ?? 0) > (time(latest.since) ?? 0) ? e : latest));
  }

  // Every stint has ended — fall back to whichever ended most recently.
  return employments.reduce((latest, e) => ((time(e.until) ?? 0) > (time(latest.until) ?? 0) ? e : latest));
}

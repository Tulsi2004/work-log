import type { Company, Employment, WorkReport, DayPlan, CustomField, PaymentType, DayType, PlanLabel } from "@prisma/client";
import type { CustomValues } from "@/lib/custom-fields";

export type { Company, Employment, WorkReport, DayPlan, CustomField, PaymentType, DayType, PlanLabel };

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

export function currentPayRate(payHistory: unknown): PayRate | undefined {
  const rates = (payHistory as PayRate[] | null) ?? [];
  if (!rates.length) return undefined;
  const today = new Date().toISOString().slice(0, 10);
  const due = rates.filter((r) => r.effectiveFrom <= today);
  return (due.length ? due : rates).reduce((latest, r) => (r.effectiveFrom > latest.effectiveFrom ? r : latest));
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

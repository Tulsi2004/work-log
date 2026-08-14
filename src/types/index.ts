import type { Company, Employment, WorkReport, PaymentType, DayType } from "@prisma/client";

export type { Company, Employment, WorkReport, PaymentType, DayType };

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

export type WorkReportWithEmployment = WorkReport & { employment: EmploymentWithCompany };

export function currentPayRate(payHistory: unknown): PayRate | undefined {
  const rates = (payHistory as PayRate[] | null) ?? [];
  if (!rates.length) return undefined;
  const today = new Date().toISOString().slice(0, 10);
  const due = rates.filter((r) => r.effectiveFrom <= today);
  return (due.length ? due : rates).reduce((latest, r) => (r.effectiveFrom > latest.effectiveFrom ? r : latest));
}

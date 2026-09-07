"use server";

import { differenceInMonths, startOfMonth } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

// Total months worked across every stint. Overlapping stints (two jobs at once)
// are merged so the same calendar time is only counted once.
function totalExperienceMonths(stints: { since: Date | null; until: Date | null }[]): number {
  const now = new Date();
  const ranges = stints
    .filter((s): s is { since: Date; until: Date | null } => Boolean(s.since))
    .map((s) => ({ start: s.since, end: s.until ?? now }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let months = 0;
  let current: { start: Date; end: Date } | undefined;

  for (const range of ranges) {
    if (current && range.start <= current.end) {
      if (range.end > current.end) current.end = range.end;
      continue;
    }
    if (current) months += differenceInMonths(current.end, current.start);
    current = { ...range };
  }
  if (current) months += differenceInMonths(current.end, current.start);

  return months;
}

export async function getDashboardStats(employmentId?: string) {
  const userId = await requireUserId();

  // Cards marked "this company" narrow to the selection in the header; without a
  // selection they cover every company, so the numbers are never blank.
  const scope: Prisma.WorkReportWhereInput = { userId, ...(employmentId ? { employmentId } : {}) };
  const count = (where: Prisma.WorkReportWhereInput) => prisma.workReport.count({ where: { ...scope, ...where } });

  const [
    totalWorkReports,
    totalCompanies,
    stints,
    openTodos,
    doneTodos,
    employmentWorkReports,
    officeDays,
    wfhDays,
    halfDays,
    leaveDays,
    companyGrantedLeaveDays,
    meetings,
    noTaskDays,
    reportsThisMonth,
  ] = await Promise.all([
    prisma.workReport.count({ where: { userId } }),
    prisma.company.count({ where: { userId } }),
    prisma.employment.findMany({ where: { company: { userId } }, select: { since: true, until: true } }),
    prisma.dayPlan.count({ where: { userId, isDone: false } }),
    prisma.dayPlan.count({ where: { userId, isDone: true } }),
    count({}),
    count({ isLeave: false, dayType: "OFFICE" }),
    count({ isLeave: false, dayType: "WORK_FROM_HOME" }),
    count({ isLeave: false, dayType: "HALF_DAY" }),
    count({ isLeave: true }),
    count({ isLeave: true, isCompanyGranted: true }),
    count({ hasMeeting: true }),
    count({ isLeave: false, hasNoTask: true }),
    count({ date: { gte: startOfMonth(new Date()) } }),
  ]);

  return {
    totalWorkReports,
    totalCompanies,
    experienceMonths: totalExperienceMonths(stints),
    openTodos,
    doneTodos,
    employmentWorkReports,
    officeDays,
    wfhDays,
    halfDays,
    leaveDays,
    companyGrantedLeaveDays,
    meetings,
    noTaskDays,
    reportsThisMonth,
  };
}

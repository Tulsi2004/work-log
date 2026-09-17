"use server";

import { startOfMonth } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { totalExperience } from "@/lib/experience";
import { parseSpends, sumMoney, sumSaved, sumSpent, toMoney } from "@/lib/money";

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
    moneyRows,
    employmentMoney,
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
    // Spends live in a Json column, so what was spent is summed here rather
    // than by the database; the rows are one user's own money entries.
    prisma.salaryEntry.findMany({ where: { userId }, select: { amount: true, spends: true } }),
    prisma.salaryEntry.aggregate({
      where: { userId, ...(employmentId ? { employmentId } : {}) },
      _sum: { amount: true },
    }),
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

  const allSpends = moneyRows.flatMap((row) => parseSpends(row.spends));
  const moneyReceived = sumMoney(moneyRows.map((row) => toMoney(row.amount)));
  // Savings and investments are money kept, not money gone.
  const moneySpent = sumSpent(allSpends);
  const moneySaved = sumSaved(allSpends);

  const experience = totalExperience(stints);

  return {
    totalWorkReports,
    totalCompanies,
    experienceMonths: experience.months,
    experienceDays: experience.days,
    openTodos,
    doneTodos,
    moneyReceived,
    moneySpent,
    moneySaved,
    employmentMoneyReceived: toMoney(employmentMoney._sum.amount ?? 0),
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

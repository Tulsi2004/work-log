"use server";

import { differenceInMonths } from "date-fns";
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

  const [totalWorkReports, totalCompanies, employmentWorkReports, stints] = await Promise.all([
    prisma.workReport.count({ where: { userId } }),
    prisma.company.count({ where: { userId } }),
    employmentId
      ? prisma.workReport.count({ where: { userId, employmentId } })
      : Promise.resolve(0),
    prisma.employment.findMany({
      where: { company: { userId } },
      select: { since: true, until: true },
    }),
  ]);

  return {
    totalWorkReports,
    totalCompanies,
    employmentWorkReports,
    experienceMonths: totalExperienceMonths(stints),
  };
}

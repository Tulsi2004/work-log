"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function getDashboardStats(employmentId?: string) {
  const userId = await requireUserId();

  const [totalWorkReports, totalCompanies, employmentWorkReports] = await Promise.all([
    prisma.workReport.count({ where: { userId } }),
    prisma.company.count({ where: { userId } }),
    employmentId
      ? prisma.workReport.count({ where: { userId, employmentId } })
      : Promise.resolve(0),
  ]);

  return { totalWorkReports, totalCompanies, employmentWorkReports };
}

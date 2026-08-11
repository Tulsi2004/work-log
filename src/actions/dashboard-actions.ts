"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function getDashboardStats() {
  const userId = await requireUserId();

  const [totalWorkReports, totalCompanies, recentWorkReports] = await Promise.all([
    prisma.workReport.count({ where: { userId } }),
    prisma.company.count({ where: { userId } }),
    prisma.workReport.findMany({
      where: { userId },
      include: { employment: { include: { company: true } } },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);

  return { totalWorkReports, totalCompanies, recentWorkReports };
}

"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function getDashboardStats() {
  const userId = await requireUserId();

  const [totalWorkReports, totalCompanies] = await Promise.all([
    prisma.workReport.count({ where: { userId } }),
    prisma.company.count({ where: { userId } }),
  ]);

  return { totalWorkReports, totalCompanies };
}

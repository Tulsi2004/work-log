import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type { Prisma, DayType } from "@prisma/client";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const employmentId = request.nextUrl.searchParams.get("employmentId")?.trim() ?? "";
  const dayType = request.nextUrl.searchParams.get("dayType")?.trim() ?? "";
  const dateFrom = request.nextUrl.searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = request.nextUrl.searchParams.get("dateTo")?.trim() ?? "";

  const where: Prisma.WorkReportWhereInput = {
    userId,
    ...(employmentId ? { employmentId } : {}),
    ...(dayType ? { dayType: dayType as DayType } : {}),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { notes: { contains: search, mode: "insensitive" } },
            { noTaskNote: { contains: search, mode: "insensitive" } },
            { leaveReason: { contains: search, mode: "insensitive" } },
            { employment: { designation: { contains: search, mode: "insensitive" } } },
            { employment: { company: { name: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const reports = await prisma.workReport.findMany({
    where,
    include: { employment: { include: { company: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ data: reports });
}

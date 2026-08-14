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
  const isLeave = request.nextUrl.searchParams.get("isLeave")?.trim() === "true";
  const projectName = request.nextUrl.searchParams.get("projectName")?.trim() ?? "";
  const assignedBy = request.nextUrl.searchParams.get("assignedBy")?.trim() ?? "";

  let taskMatchIds: string[] = [];
  if (search) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "WorkReport"
      WHERE "userId" = ${userId} AND tasks::text ILIKE ${`%${search}%`}
    `;
    taskMatchIds = rows.map((r) => r.id);
  }

  let projectTaskIds: string[] = [];
  if (projectName) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "WorkReport"
      WHERE "userId" = ${userId} AND tasks::text ILIKE ${`%${projectName}%`}
    `;
    projectTaskIds = rows.map((r) => r.id);
  }

  let assignedByTaskIds: string[] = [];
  if (assignedBy) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "WorkReport"
      WHERE "userId" = ${userId} AND tasks::text ILIKE ${`%${assignedBy}%`}
    `;
    assignedByTaskIds = rows.map((r) => r.id);
  }

  const where: Prisma.WorkReportWhereInput = {
    userId,
    ...(employmentId ? { employmentId } : {}),
    ...(dayType ? { dayType: dayType as DayType } : {}),
    ...(isLeave ? { isLeave: true } : {}),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search || projectName || assignedBy
      ? {
          OR: [
            ...(search
              ? [
                  { notes: { contains: search, mode: "insensitive" } },
                  { noTaskNote: { contains: search, mode: "insensitive" } },
                  { leaveReason: { contains: search, mode: "insensitive" } },
                  { employment: { designation: { contains: search, mode: "insensitive" } } },
                  { employment: { company: { name: { contains: search, mode: "insensitive" } } } },
                  ...(taskMatchIds.length ? [{ id: { in: taskMatchIds } }] : []),
                ]
              : []),
            ...(projectName ? [{ id: { in: projectTaskIds } }] : []),
            ...(assignedBy ? [{ id: { in: assignedByTaskIds } }] : []),
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

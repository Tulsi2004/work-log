import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  loadCustomValues,
  attachCustomValues,
  recordIdsMatchingFilters,
} from "@/lib/custom-field-store";
import { readCustomFilters } from "@/lib/custom-field-params";
import type { Prisma, PlanLabel } from "@prisma/client";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim() ?? "";
  const label = params.get("label")?.trim() ?? "";
  const employmentId = params.get("employmentId")?.trim() ?? "";
  const dateFrom = params.get("dateFrom")?.trim() ?? "";
  const dateTo = params.get("dateTo")?.trim() ?? "";
  // "open" | "done" — anything else means both.
  const status = params.get("status")?.trim() ?? "";
  const customMatchIds = await recordIdsMatchingFilters(userId, "DAY_PLAN", readCustomFilters(params));

  const where: Prisma.DayPlanWhereInput = {
    userId,
    ...(customMatchIds ? { id: { in: customMatchIds } } : {}),
    ...(label ? { label: label as PlanLabel } : {}),
    ...(employmentId ? { employmentId } : {}),
    ...(status === "open" ? { isDone: false } : status === "done" ? { isDone: true } : {}),
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
            { title: { contains: search, mode: "insensitive" as const } },
            { detail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const plans = await prisma.dayPlan.findMany({
    where,
    include: { employment: { include: { company: true } } },
    orderBy: [{ date: "desc" }, { isDone: "asc" }, { createdAt: "asc" }],
  });

  const values = await loadCustomValues(userId, plans.map((p) => p.id));

  return NextResponse.json({ data: attachCustomValues(plans, values) });
}

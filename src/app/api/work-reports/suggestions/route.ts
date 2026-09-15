import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  // "projectName" and "assignedBy" live inside the tasks Json; "meetingWith" is
  // a column of its own.
  const type = request.nextUrl.searchParams.get("type")?.trim() ?? "";
  // Optional: keep suggestions to a single employment, so past jobs' values do not leak in.
  const employmentId = request.nextUrl.searchParams.get("employmentId")?.trim() ?? "";

  if (type !== "projectName" && type !== "assignedBy" && type !== "meetingWith") {
    return NextResponse.json({ data: [] });
  }

  try {
    if (type === "meetingWith") {
      const rows = await prisma.workReport.findMany({
        where: { userId, ...(employmentId ? { employmentId } : {}), hasMeeting: true },
        select: { meetingWith: true },
      });
      const names = new Set<string>();
      for (const row of rows) {
        const value = row.meetingWith?.trim();
        if (value) names.add(value);
      }
      return NextResponse.json({ data: Array.from(names).sort() });
    }

    // Fetch the matching work reports and extract unique values from tasks JSON
    const reports = await prisma.workReport.findMany({
      where: { userId, ...(employmentId ? { employmentId } : {}) },
      select: { tasks: true },
    });

    const values = new Set<string>();

    for (const report of reports) {
      const tasks = (report.tasks as Array<{ projectName?: string; assignedBy?: string }> | null) ?? [];
      for (const task of tasks) {
        const value = type === "projectName" ? task.projectName : task.assignedBy;
        if (value && typeof value === "string" && value.trim()) {
          values.add(value.trim());
        }
      }
    }

    // Sort and return unique values
    const sorted = Array.from(values).sort();
    return NextResponse.json({ data: sorted });
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    return NextResponse.json({ data: [] });
  }
}

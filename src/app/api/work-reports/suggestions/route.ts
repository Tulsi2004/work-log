import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const type = request.nextUrl.searchParams.get("type")?.trim() ?? ""; // "projectName" or "assignedBy"

  if (type !== "projectName" && type !== "assignedBy") {
    return NextResponse.json({ data: [] });
  }

  try {
    // Fetch all work reports for this user and extract unique values from tasks JSON
    const reports = await prisma.workReport.findMany({
      where: { userId },
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

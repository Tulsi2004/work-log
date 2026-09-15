import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { parseSpends } from "@/lib/money";

// "source" — where past money came from; "spend" — what past money went on.
const TYPES = ["source", "spend"] as const;
type SuggestionType = (typeof TYPES)[number];

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const type = request.nextUrl.searchParams.get("type")?.trim() ?? "";
  // Optional: keep sources to one company, so another job's values do not leak in.
  const employmentId = request.nextUrl.searchParams.get("employmentId")?.trim() ?? "";

  if (!TYPES.includes(type as SuggestionType)) {
    return NextResponse.json({ data: [] });
  }

  const entries = await prisma.salaryEntry.findMany({
    where: { userId, ...(type === "source" && employmentId ? { employmentId } : {}) },
    select: { source: true, spends: true },
  });

  const values = new Set<string>();
  for (const entry of entries) {
    if (type === "source") {
      const source = entry.source?.trim();
      if (source) values.add(source);
      continue;
    }
    for (const spend of parseSpends(entry.spends)) {
      const what = spend.what.trim();
      if (what) values.add(what);
    }
  }

  return NextResponse.json({ data: [...values].sort((a, b) => a.localeCompare(b)) });
}

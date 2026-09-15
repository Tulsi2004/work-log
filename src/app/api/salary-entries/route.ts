import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  loadCustomValues,
  attachCustomValues,
  recordIdsMatchingFilters,
} from "@/lib/custom-field-store";
import { readCustomFilters } from "@/lib/custom-field-params";
import { parseSpends, sumMoney, sumSaved, sumSpent, toMoney, type SalarySpend } from "@/lib/money";
import type { Prisma } from "@prisma/client";
import type { SalaryEntryWithEmployment } from "@/types";

export interface SalaryTotals {
  received: number;
  // Money that is actually gone; `saved` is what went into savings or
  // investments and is still yours.
  spent: number;
  saved: number;
  count: number;
  // Every category the filtered entries actually spent on, biggest first.
  byCategory: { category: string; amount: number }[];
}

function categoryTotals(spends: SalarySpend[]): SalaryTotals["byCategory"] {
  const totals = new Map<string, number[]>();
  for (const spend of spends) {
    const amounts = totals.get(spend.category) ?? [];
    amounts.push(spend.amount);
    totals.set(spend.category, amounts);
  }
  return [...totals.entries()]
    .map(([category, amounts]) => ({ category, amount: sumMoney(amounts) }))
    .sort((a, b) => b.amount - a.amount);
}

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const employmentId = params.get("employmentId")?.trim() ?? "";
  const category = params.get("category")?.trim() ?? "";
  const dateFrom = params.get("dateFrom")?.trim() ?? "";
  const dateTo = params.get("dateTo")?.trim() ?? "";
  const customMatchIds = await recordIdsMatchingFilters(
    userId,
    "SALARY_ENTRY",
    readCustomFilters(params)
  );

  const where: Prisma.SalaryEntryWhereInput = {
    userId,
    ...(customMatchIds ? { id: { in: customMatchIds } } : {}),
    ...(employmentId ? { employmentId } : {}),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const rows = await prisma.salaryEntry.findMany({
    where,
    include: { employment: { include: { company: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const values = await loadCustomValues(
    userId,
    rows.map((row) => row.id)
  );

  const entries = attachCustomValues(
    rows.map((row) => ({ ...row, amount: toMoney(row.amount), spends: parseSpends(row.spends) })),
    values
  );

  // Search and category live inside the spends, which are a Json column — no
  // Prisma filter reaches them, so both are applied here over the fetched rows.
  const matching: SalaryEntryWithEmployment[] = entries.filter((entry) => {
    if (category && !entry.spends.some((spend) => spend.category === category)) return false;
    if (!search) return true;
    return [
      entry.source ?? "",
      entry.note ?? "",
      entry.employment?.company.name ?? "",
      ...entry.spends.map((spend) => spend.what),
    ].some((text) => text.toLowerCase().includes(search));
  });

  // Totals follow the filters, so narrowing to a company or a month answers
  // "how much did that come to" without a second request.
  const spends = matching.flatMap((entry) => entry.spends);
  const received = sumMoney(matching.map((entry) => entry.amount));
  const spent = sumSpent(spends);
  const saved = sumSaved(spends);

  const totals: SalaryTotals = {
    received,
    spent,
    saved,
    count: matching.length,
    byCategory: categoryTotals(spends),
  };

  return NextResponse.json({ data: matching, totals });
}

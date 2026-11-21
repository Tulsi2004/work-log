"use client";

import { format } from "date-fns";
import { SERIES_COLOURS, TrendChart, type TrendRow } from "@/components/ui/trend-chart";
import { sumMoney, sumSpent } from "@/lib/money";
import { formatMoney } from "@/utils/format";
import type { SalaryEntryWithEmployment } from "@/types";

const SERIES = [
  { key: "received", name: "Received", bar: SERIES_COLOURS[0] },
  { key: "spent", name: "Spent", bar: SERIES_COLOURS[1] },
  { key: "saved", name: "Saved", bar: SERIES_COLOURS[2] },
  { key: "invested", name: "Invested", bar: SERIES_COLOURS[3] },
] as const;

type MonthTotals = TrendRow<(typeof SERIES)[number]["key"]>;

// One row per calendar month the entries span, gaps filled with zeros so the
// axis is honest about a month where nothing came in.
function monthlyTotals(entries: SalaryEntryWithEmployment[]): MonthTotals[] {
  const byMonth = new Map<string, SalaryEntryWithEmployment[]>();
  for (const entry of entries) {
    const month = new Date(entry.date).toISOString().slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), entry]);
  }
  const months = [...byMonth.keys()].sort();
  if (!months.length) return [];

  const rows: MonthTotals[] = [];
  const [lastYear, lastMonth] = months[months.length - 1].split("-").map(Number);
  for (let [year, month] = months[0].split("-").map(Number); year * 12 + month <= lastYear * 12 + lastMonth; ) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const inMonth = byMonth.get(key) ?? [];
    const spends = inMonth.flatMap((entry) => entry.spends);
    const kept = (category: string) =>
      sumMoney(spends.filter((s) => s.category === category).map((s) => s.amount));
    rows.push({
      month: key,
      label: format(new Date(year, month - 1, 1), "MMM yy"),
      received: sumMoney(inMonth.map((entry) => entry.amount)),
      spent: sumSpent(spends),
      saved: kept("SAVINGS"),
      invested: kept("INVESTMENT"),
    });
    [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
  }
  return rows;
}

export function MoneyTrendChart({ entries }: { entries: SalaryEntryWithEmployment[] }) {
  return (
    <TrendChart
      series={SERIES}
      rows={monthlyTotals(entries)}
      formatValue={formatMoney}
      empty="Nothing to chart yet — add some money first."
    />
  );
}

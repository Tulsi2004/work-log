"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { sumMoney, sumSpent } from "@/lib/money";
import { formatMoney } from "@/utils/format";
import type { SalaryEntryWithEmployment } from "@/types";

// Fixed order, never re-ranked: the colours were checked as adjacent pairs for
// colour-blind separation in this order, light and dark (dataviz validator).
// Yellow and aqua sit under 3:1 on the light card, so the table view is always
// one click away.
const SERIES = [
  { key: "received", name: "Received", bar: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  { key: "spent", name: "Spent", bar: "bg-[#eb6834] dark:bg-[#d95926]" },
  { key: "saved", name: "Saved", bar: "bg-[#1baf7a] dark:bg-[#199e70]" },
  { key: "invested", name: "Invested", bar: "bg-[#eda100] dark:bg-[#c98500]" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];
type MonthTotals = { month: string; label: string } & Record<SeriesKey, number>;

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

// A round axis top — 1, 2, 2.5 or 5 times a power of ten — split into four.
function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? rough;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

export function MoneyTrendChart({ entries }: { entries: SalaryEntryWithEmployment[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const rows = monthlyTotals(entries);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Nothing to chart yet — add some money first.</p>;
  }

  const ticks = niceTicks(Math.max(...rows.flatMap((row) => SERIES.map((s) => row[s.key]))));
  const top = ticks[ticks.length - 1] || 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-[2px]", s.bar)} />
              {s.name}
            </li>
          ))}
        </ul>
        <div className="flex rounded-lg border p-0.5 text-xs" role="group" aria-label="View">
          {(["chart", "table"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              aria-pressed={view === option}
              className={cn(
                "rounded-md px-2.5 py-1 capitalize transition-colors",
                view === option ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              {SERIES.map((s) => (
                <TableHead key={s.key} className="text-right">
                  {s.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell>{row.label}</TableCell>
                {SERIES.map((s) => (
                  <TableCell key={s.key} className="text-right tabular-nums">
                    {formatMoney(row[s.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div>
          <div className="flex gap-2">
            {/* Y axis: clean round ticks, the values the bars are not labelled with. */}
            <div className="relative h-56 w-10 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
              {ticks.map((tick) => (
                <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(tick / top) * 100}%` }}>
                  {compact.format(tick)}
                </span>
              ))}
            </div>

            <div className="relative h-56 flex-1">
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className={cn("absolute inset-x-0 border-t", tick === 0 ? "border-border" : "border-border/50")}
                  style={{ bottom: `${(tick / top) * 100}%` }}
                />
              ))}

              <div className="absolute inset-0 flex">
                {rows.map((row, index) => (
                  <div
                    key={row.month}
                    // The whole month band is the hover target, not the thin bars.
                    tabIndex={0}
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    aria-label={`${row.label}: ${SERIES.map((s) => `${s.name} ${formatMoney(row[s.key])}`).join(", ")}`}
                    className={cn(
                      "flex h-full flex-1 items-end justify-center gap-0.5 rounded-sm px-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      active === index && "bg-muted/50"
                    )}
                  >
                    {SERIES.map((s) => (
                      <div
                        key={s.key}
                        className={cn("w-full max-w-6 rounded-t-[4px]", s.bar)}
                        style={{ height: `${(row[s.key] / top) * 100}%` }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {active !== null && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-lg border bg-popover p-2.5 text-xs shadow-md"
                  style={{ left: `clamp(5.5rem, ${((active + 0.5) / rows.length) * 100}%, calc(100% - 5.5rem))` }}
                >
                  <p className="mb-1.5 font-medium">{rows[active].label}</p>
                  <ul className="space-y-1">
                    {SERIES.map((s) => (
                      <li key={s.key} className="flex items-center gap-2">
                        <span className={cn("h-0.5 w-3 rounded-full", s.bar)} />
                        <span className="flex-1 text-muted-foreground">{s.name}</span>
                        <span className="font-semibold tabular-nums">{formatMoney(rows[active][s.key])}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="ml-12 flex">
            {rows.map((row) => (
              <span key={row.month} className="flex-1 truncate pt-1.5 text-center text-[11px] text-muted-foreground">
                {row.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

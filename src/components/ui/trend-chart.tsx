"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Validated palette in its fixed order — the colours were checked as adjacent
// pairs for colour-blind separation in this order, light and dark (dataviz
// validator). Never re-rank; take a prefix. Yellow sits under 3:1 on the light
// card, so the table view is always one click away.
export const SERIES_COLOURS = [
  "bg-[#2a78d6] dark:bg-[#3987e5]",
  "bg-[#eb6834] dark:bg-[#d95926]",
  "bg-[#1baf7a] dark:bg-[#199e70]",
  "bg-[#eda100] dark:bg-[#c98500]",
] as const;

export type TrendSeries<K extends string> = { key: K; name: string; bar: string };
export type TrendRow<K extends string> = { month: string; label: string } & Record<K, number>;

// A round axis top — 1, 2, 2.5 or 5 times a power of ten — split into four.
function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? rough;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

interface TrendChartProps<K extends string> {
  series: readonly TrendSeries<K>[];
  rows: TrendRow<K>[];
  formatValue: (value: number) => string;
  empty?: string;
}

// Grouped monthly bars with a chart/table toggle, shared by every trend view.
export function TrendChart<K extends string>({ series, rows, formatValue, empty = "Nothing to chart yet." }: TrendChartProps<K>) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  const ticks = niceTicks(Math.max(...rows.flatMap((row) => series.map((s) => row[s.key]))));
  const top = ticks[ticks.length - 1] || 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
          {series.map((s) => (
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
              {series.map((s) => (
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
                {series.map((s) => (
                  <TableCell key={s.key} className="text-right tabular-nums">
                    {formatValue(row[s.key])}
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
                    aria-label={`${row.label}: ${series.map((s) => `${s.name} ${formatValue(row[s.key])}`).join(", ")}`}
                    className={cn(
                      "flex h-full flex-1 items-end justify-center gap-0.5 rounded-sm px-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      active === index && "bg-muted/50"
                    )}
                  >
                    {series.map((s) => (
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
                    {series.map((s) => (
                      <li key={s.key} className="flex items-center gap-2">
                        <span className={cn("h-0.5 w-3 rounded-full", s.bar)} />
                        <span className="flex-1 text-muted-foreground">{s.name}</span>
                        <span className="font-semibold tabular-nums">{formatValue(rows[active][s.key])}</span>
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

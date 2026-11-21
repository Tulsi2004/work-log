"use client";

import { SERIES_COLOURS, TrendChart } from "@/components/ui/trend-chart";
import { formatHours, monthlyWork } from "@/lib/work-time";
import type { WorkReportWithEmployment } from "@/types";

// Palette order kept as validated, so the series follow it rather than reading order.
const DAY_SERIES = [
  { key: "office", name: "Office", bar: SERIES_COLOURS[0] },
  { key: "leave", name: "Leave", bar: SERIES_COLOURS[1] },
  { key: "wfh", name: "Work from home", bar: SERIES_COLOURS[2] },
  { key: "halfDay", name: "Half day", bar: SERIES_COLOURS[3] },
] as const;

const HOUR_SERIES = [{ key: "hours", name: "Hours worked", bar: SERIES_COLOURS[0] }] as const;

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
const hours = (n: number) => formatHours(n * 60);

export function WorkTrendChart({ reports }: { reports: WorkReportWithEmployment[] }) {
  const rows = monthlyWork(reports);
  const total = (key: "office" | "wfh" | "halfDay" | "leave" | "hours") => rows.reduce((n, r) => n + r[key], 0);
  const worked = total("office") + total("wfh") + total("halfDay");
  const timed = reports.filter((r) => !r.isLeave && r.timeFrom && r.timeTo).length;

  const stats = [
    ["Days worked", days(worked)],
    ["Leave taken", days(total("leave"))],
    ["Hours worked", hours(total("hours"))],
    ["Average per day", timed ? hours(total("hours") / timed) : "—"],
  ];

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Days per month</h3>
        <TrendChart series={DAY_SERIES} rows={rows} formatValue={days} empty="No work reports to chart yet." />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Hours per month</h3>
        <TrendChart series={HOUR_SERIES} rows={rows} formatValue={hours} empty="No work reports to chart yet." />
      </section>
    </div>
  );
}

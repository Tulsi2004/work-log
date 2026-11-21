import { format } from "date-fns";
import type { WorkReport, WorkReportTask } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Dates arrive as Date from Prisma and as ISO strings over JSON.
type ReportLike = Pick<WorkReport, "isLeave" | "dayType" | "timeFrom" | "timeTo"> & {
  date: Date | string;
  leaveFrom: Date | string | null;
  leaveTo: Date | string | null;
};

const toDate = (value: Date | string) => new Date(value);

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// A shift that runs past midnight (22:00 to 06:00) still counts its 8 hours.
export function workedMinutes(timeFrom: string, timeTo: string): number {
  const diff = minutesOf(timeTo) - minutesOf(timeFrom);
  return Number.isFinite(diff) ? (diff + 24 * 60) % (24 * 60) : 0;
}

export function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} m` : `${hours} h`;
}

// A long vacation is one row running leaveFrom to leaveTo, so it covers every
// day in between — clipped to the period being looked at, when there is one.
export function leaveDates(report: ReportLike, from?: Date, to?: Date): Date[] {
  let start = toDate(report.leaveFrom ?? report.date);
  let end = report.leaveTo ? toDate(report.leaveTo) : start;
  if (from && start < from) start = from;
  if (to && end > to) end = to;
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) days.push(new Date(t));
  return days.length ? days : [start];
}

export type WorkMonth = {
  month: string;
  label: string;
  office: number;
  wfh: number;
  halfDay: number;
  leave: number;
  // Hours clocked, from each day's time-from/time-to.
  hours: number;
};

const monthKey = (date: Date) => date.toISOString().slice(0, 7);

// One row per calendar month the reports span, gaps filled with zeros so a
// month with nothing logged still shows up on the axis.
export function monthlyWork(reports: ReportLike[]): WorkMonth[] {
  const byMonth = new Map<string, WorkMonth>();
  const row = (key: string) => {
    let r = byMonth.get(key);
    if (!r) {
      const [y, m] = key.split("-").map(Number);
      r = { month: key, label: format(new Date(y, m - 1, 1), "MMM yy"), office: 0, wfh: 0, halfDay: 0, leave: 0, hours: 0 };
      byMonth.set(key, r);
    }
    return r;
  };

  for (const report of reports) {
    if (report.isLeave) {
      for (const day of leaveDates(report)) row(monthKey(day)).leave += 1;
      continue;
    }
    const r = row(monthKey(toDate(report.date)));
    if (report.dayType === "WORK_FROM_HOME") r.wfh += 1;
    else if (report.dayType === "HALF_DAY") r.halfDay += 1;
    else r.office += 1;
    if (report.timeFrom && report.timeTo) r.hours += workedMinutes(report.timeFrom, report.timeTo) / 60;
  }

  const keys = [...byMonth.keys()].sort();
  if (!keys.length) return [];
  const [lastY, lastM] = keys[keys.length - 1].split("-").map(Number);
  const rows: WorkMonth[] = [];
  for (let [y, m] = keys[0].split("-").map(Number); y * 12 + m <= lastY * 12 + lastM; [y, m] = m === 12 ? [y + 1, 1] : [y, m + 1]) {
    rows.push(row(`${y}-${String(m).padStart(2, "0")}`));
  }
  return rows;
}

// Days spent on each project, most first. A day with three tasks on one
// project counts once; names match ignoring case and stray spaces.
export function projectDays(reports: Pick<WorkReport, "isLeave" | "tasks">[]): { name: string; days: number }[] {
  const byKey = new Map<string, { name: string; days: number }>();
  for (const report of reports) {
    if (report.isLeave) continue;
    const names = ((report.tasks as WorkReportTask[] | null) ?? []).map((t) => t.projectName?.trim()).filter(Boolean) as string[];
    const seen = new Set<string>();
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = byKey.get(key) ?? { name, days: 0 };
      entry.days += 1;
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()].sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { employmentLabel, formatDate, formatDay, formatEnumLabel, formatTime } from "@/utils/format";
import type { WorkReport, WorkReportTask } from "@/types";
import { PrintButton } from "./print-button";

// Outside the (dashboard) group on purpose: no navbar or chat widget, just the
// report, laid out for paper. Opened from the Work log's "Export report" dialog.
export const metadata: Metadata = { title: "Work report" };

const DAY_MS = 24 * 60 * 60 * 1000;

const isDay = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// A shift that runs past midnight (22:00 to 06:00) still counts its 8 hours.
function workedMinutes(timeFrom: string, timeTo: string): number {
  const diff = minutesOf(timeTo) - minutesOf(timeFrom);
  return Number.isFinite(diff) ? (diff + 24 * 60) % (24 * 60) : 0;
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} m` : `${hours} h`;
}

// A long vacation is one row running leaveFrom to leaveTo, so it counts every
// day it covers — but only the days inside the period being reported.
function leaveDays(report: WorkReport, from?: Date, to?: Date): number {
  let start = report.leaveFrom ?? report.date;
  let end = report.leaveTo ?? start;
  if (from && start < from) start = from;
  if (to && end > to) end = to;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
}

function taskLines(report: WorkReport): string[] {
  if (report.hasNoTask) return [report.noTaskNote ? `No task — ${report.noTaskNote}` : "No task"];
  return ((report.tasks as WorkReportTask[] | null) ?? []).map((t) =>
    [t.task, t.projectName].filter(Boolean).join(" — ")
  );
}

export default async function WorkReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const { employmentId, from, to } = await searchParams;
  if (typeof employmentId !== "string") notFound();

  // Stored dates are UTC midnight, the same as `new Date("yyyy-MM-dd")`, so the
  // range is inclusive at both ends.
  const fromDate = isDay(from) ? new Date(from) : undefined;
  const toDate = isDay(to) ? new Date(to) : undefined;

  const [employment, reports] = await Promise.all([
    prisma.employment.findFirst({ where: { id: employmentId, company: { userId } }, include: { company: true } }),
    prisma.workReport.findMany({
      where: {
        userId,
        employmentId,
        date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  if (!employment) notFound();

  const worked = reports.filter((r) => !r.isLeave);
  const minutes = worked.reduce(
    (total, r) => total + (r.timeFrom && r.timeTo ? workedMinutes(r.timeFrom, r.timeTo) : 0),
    0
  );
  const summary: [string, string | number][] = [
    ["Days reported", reports.length],
    ["Office", worked.filter((r) => r.dayType === "OFFICE").length],
    ["Work from home", worked.filter((r) => r.dayType === "WORK_FROM_HOME").length],
    ["Half days", worked.filter((r) => r.dayType === "HALF_DAY").length],
    ["Leave days", reports.filter((r) => r.isLeave).reduce((n, r) => n + leaveDays(r, fromDate, toDate), 0)],
    ["Meetings", reports.filter((r) => r.hasMeeting).length],
    ...(minutes ? [["Hours logged", formatHours(minutes)] as [string, string]] : []),
  ];

  const period =
    fromDate || toDate
      ? `${fromDate ? formatDate(fromDate) : "…"} – ${toDate ? formatDate(toDate) : "…"}`
      : "All dates";

  return (
    // Colours are set outright rather than from the theme, so the page reads as
    // paper on screen and prints light even when the app is in dark mode.
    <div className="flex-1 bg-white text-zinc-900 [print-color-adjust:exact]">
      <div className="mx-auto max-w-5xl p-6 sm:p-10 print:max-w-none print:p-0">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-300 pb-4">
          <div>
            <h1 className="text-2xl font-semibold">Work report</h1>
            <p className="mt-1 text-base font-medium">{employmentLabel(employment)}</p>
            <p className="text-sm text-zinc-600">
              {period} · Generated {formatDate(new Date())}
            </p>
          </div>
          <PrintButton />
        </header>

        <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-7">
          {summary.map(([label, value]) => (
            <div key={label} className="rounded-md border border-zinc-200 px-3 py-2">
              <dt className="text-xs text-zinc-600">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {reports.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-600">No work reports in this period.</p>
        ) : (
          <table className="mt-6 w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-300 text-left text-xs uppercase tracking-wide text-zinc-600">
                <th className="w-[13%] py-2 pr-3 font-medium">Date</th>
                <th className="w-[11%] py-2 pr-3 font-medium">Day type</th>
                <th className="w-[14%] py-2 pr-3 font-medium">Time</th>
                <th className="w-[32%] py-2 pr-3 font-medium">Tasks</th>
                <th className="w-[15%] py-2 pr-3 font-medium">Meeting</th>
                <th className="w-[15%] py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const isLongLeave =
                  r.isLeave && !!r.leaveFrom && !!r.leaveTo && r.leaveTo.getTime() !== r.leaveFrom.getTime();
                const lines = taskLines(r);
                return (
                  <tr
                    key={r.id}
                    className={`break-inside-avoid border-b border-zinc-200 align-top ${r.isLeave ? "bg-rose-50" : ""}`}
                  >
                    <td className="py-2 pr-3">
                      <div className="font-medium">{formatDate(r.date)}</div>
                      <div className="text-xs text-zinc-600">{formatDay(r.date)}</div>
                    </td>
                    <td className="py-2 pr-3">
                      {r.isLeave ? (
                        <span className="font-semibold text-rose-700">
                          {r.isCompanyGranted ? "Company leave" : "Leave"}
                        </span>
                      ) : (
                        formatEnumLabel(r.dayType)
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {!r.isLeave && (r.timeFrom || r.timeTo)
                        ? `${formatTime(r.timeFrom) ?? "—"} – ${formatTime(r.timeTo) ?? "—"}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {r.isLeave ? (
                        <span>
                          {r.leaveReason || "On leave"}
                          {isLongLeave && (
                            <span className="text-zinc-600">
                              {" "}
                              ({formatDate(r.leaveFrom!)} – {formatDate(r.leaveTo!)})
                            </span>
                          )}
                        </span>
                      ) : lines.length > 0 ? (
                        <ol className={lines.length > 1 ? "list-decimal space-y-0.5 pl-4" : ""}>
                          {lines.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ol>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {r.hasMeeting ? [r.meetingWith, r.meetingTopic].filter(Boolean).join(" — ") || "Yes" : "—"}
                    </td>
                    <td className="whitespace-pre-line py-2">{r.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

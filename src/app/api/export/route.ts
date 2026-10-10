import { NextRequest, NextResponse } from "next/server";
import type { CustomField, CustomFieldEntity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { listFieldsForEntity, loadCustomValues } from "@/lib/custom-field-store";
import { parseSpends, spendCategoryName, sumSaved, sumSpent, toMoney } from "@/lib/money";
import { planLabelLook, planLabelLooks } from "@/lib/plan-labels";
import { currentPayRate, type WorkReportTask } from "@/types";
import { employmentLabel, formatEnumLabel, formatMoney } from "@/utils/format";

type Cell = string | number | null | undefined;

// Dates are stored as UTC midnight (`new Date("yyyy-MM-dd")`), so the UTC date
// is the day the user picked, whatever timezone the server runs in.
const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : "");

const isDay = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

// RFC 4180, written for Excel: a cell holding a quote, comma or line break is
// quoted with its quotes doubled, and the BOM up front is what makes Excel read
// the file as UTF-8 — without it ₹ and every non-ASCII letter turn to mojibake.
function toCsv(rows: Cell[][]): string {
  const cell = (value: Cell) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return String(value);
    // Excel runs a cell starting with = + - @ as a formula, so a task written as
    // "- fixed login" would open as #NAME?. The apostrophe keeps it text.
    const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

function download(body: string, filename: string, type: string) {
  return new Response(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function customCell(field: CustomField, value: string | undefined): Cell {
  if (!value) return undefined;
  if (field.type === "CHECKBOX") return value === "true" ? "Yes" : "No";
  // A number goes out as a number, so Excel can sum it (and a negative one is
  // not mistaken for a formula).
  if (field.type === "NUMBER" && Number.isFinite(Number(value))) return Number(value);
  return value;
}

// The user's own fields ride along as extra columns at the end of every row.
async function customColumns(userId: string, entity: CustomFieldEntity, recordIds: string[]) {
  const [fields, values] = await Promise.all([
    listFieldsForEntity(userId, entity),
    loadCustomValues(userId, recordIds),
  ]);
  return {
    header: fields.map((field) => field.name),
    cells: (recordId: string) => fields.map((field) => customCell(field, values[recordId]?.[field.id])),
  };
}

function taskLines(report: { hasNoTask: boolean; noTaskNote: string | null; tasks: Prisma.JsonValue }) {
  if (report.hasNoTask) return report.noTaskNote ? `No task — ${report.noTaskNote}` : "No task";
  return ((report.tasks as WorkReportTask[] | null) ?? [])
    .map(
      (t) =>
        [t.task, t.projectName].filter(Boolean).join(" — ") + (t.assignedBy ? ` (by ${t.assignedBy})` : "")
    )
    .join("\n");
}

async function workReportRows(userId: string, params: URLSearchParams): Promise<Cell[][]> {
  // The report-export dialog narrows this to one company and one period.
  const employmentId = params.get("employmentId")?.trim();
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");

  const reports = await prisma.workReport.findMany({
    where: {
      userId,
      ...(employmentId ? { employmentId } : {}),
      date: {
        ...(isDay(dateFrom) ? { gte: new Date(dateFrom) } : {}),
        ...(isDay(dateTo) ? { lte: new Date(dateTo) } : {}),
      },
    },
    include: { employment: { include: { company: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const custom = await customColumns(userId, "WORK_REPORT", reports.map((r) => r.id));

  return [
    [
      "Date",
      "Company",
      "Day type",
      "Time from",
      "Time to",
      "Leave from",
      "Leave to",
      "Leave reason",
      "Meeting",
      "Tasks",
      "Notes",
      ...custom.header,
    ],
    ...reports.map((r) => [
      day(r.date),
      employmentLabel(r.employment),
      r.isLeave ? (r.isCompanyGranted ? "Company leave" : "Leave") : formatEnumLabel(r.dayType),
      r.timeFrom,
      r.timeTo,
      day(r.leaveFrom),
      day(r.leaveTo),
      r.leaveReason,
      r.hasMeeting ? [r.meetingWith, r.meetingTopic].filter(Boolean).join(" — ") || "Yes" : "",
      taskLines(r),
      r.notes,
      ...custom.cells(r.id),
    ]),
  ];
}

async function moneyRows(userId: string): Promise<Cell[][]> {
  const entries = await prisma.salaryEntry.findMany({
    where: { userId },
    include: { employment: { include: { company: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const custom = await customColumns(userId, "SALARY_ENTRY", entries.map((e) => e.id));

  return [
    ["Date", "Company", "Source", "Amount", "Spent", "Saved", "Spends", "Note", ...custom.header],
    ...entries.map((e) => {
      const spends = parseSpends(e.spends);
      return [
        day(e.date),
        e.employment ? employmentLabel(e.employment) : "",
        e.source,
        toMoney(e.amount),
        sumSpent(spends),
        sumSaved(spends),
        spends.map((s) => `${s.what} ${formatMoney(s.amount)} (${spendCategoryName(s.category)})`).join("; "),
        e.note,
        ...custom.cells(e.id),
      ];
    }),
  ];
}

async function plannerRows(userId: string): Promise<Cell[][]> {
  const [plans, labels] = await Promise.all([
    prisma.dayPlan.findMany({
      where: { userId },
      include: { employment: { include: { company: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.planLabel.findMany({ where: { userId } }),
  ]);
  const looks = planLabelLooks(labels);
  const custom = await customColumns(userId, "DAY_PLAN", plans.map((p) => p.id));

  return [
    ["Date", "Title", "Detail", "Label", "Company", "Done", "Done on", ...custom.header],
    ...plans.map((p) => [
      day(p.date),
      p.title,
      p.detail,
      planLabelLook(p.label, looks).name,
      p.employment ? employmentLabel(p.employment) : "",
      p.isDone ? "Yes" : "No",
      day(p.doneAt),
      ...custom.cells(p.id),
    ]),
  ];
}

async function companyRows(userId: string): Promise<Cell[][]> {
  const employments = await prisma.employment.findMany({
    where: { company: { userId } },
    include: { company: true },
    orderBy: [{ company: { name: "asc" } }, { since: "desc" }],
  });
  const custom = await customColumns(userId, "EMPLOYMENT", employments.map((e) => e.id));

  return [
    [
      "Company",
      "Designation",
      "Employment type",
      "Since",
      "Until",
      "Payment",
      "Pay day",
      "Actual salary",
      "PF",
      "In-hand salary",
      "CEO",
      "Job source",
      "Default time from",
      "Default time to",
      ...custom.header,
    ],
    ...employments.map((e) => {
      // The pay in force today; the full history is in the JSON backup.
      const rate = currentPayRate(e.payHistory);
      return [
        e.company.name,
        e.designation,
        formatEnumLabel(e.employmentType),
        day(e.since),
        day(e.until),
        formatEnumLabel(e.paymentType),
        e.payDay,
        rate?.actualSalary,
        rate?.pf,
        rate?.inHandSalary,
        e.company.ceoName,
        e.company.jobSource,
        e.company.defaultTimeFrom,
        e.company.defaultTimeTo,
        ...custom.cells(e.id),
      ];
    }),
  ];
}

const CSV_SECTIONS: Record<string, (userId: string, params: URLSearchParams) => Promise<Cell[][]>> = {
  "work-reports": workReportRows,
  money: moneyRows,
  planner: plannerRows,
  companies: companyRows,
};

// Everything the user has, as the rows themselves — enough to rebuild from.
// Employments have no userId of their own; they come in under their company.
async function backup(userId: string) {
  const [companies, workReports, dayPlans, planLabels, salaryEntries, customFields, preferences, customCards] =
    await Promise.all([
      prisma.company.findMany({ where: { userId }, include: { employments: true } }),
      prisma.workReport.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.dayPlan.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.planLabel.findMany({ where: { userId } }),
      prisma.salaryEntry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.customField.findMany({ where: { userId }, include: { values: { where: { userId } } } }),
      prisma.userPreference.findMany({ where: { userId } }),
      prisma.customCard.findMany({ where: { userId } }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    companies,
    workReports,
    dayPlans,
    planLabels,
    // A Decimal serialises as a string; a backup should read as the number it is.
    salaryEntries: salaryEntries.map((entry) => ({ ...entry, amount: toMoney(entry.amount) })),
    customFields,
    preferences,
    customCards,
  };
}

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const params = request.nextUrl.searchParams;
  const format = params.get("format");
  const what = params.get("what") ?? "";
  const today = day(new Date());

  if (format === "json") {
    return download(JSON.stringify(await backup(userId), null, 2), `tulsi-backup-${today}.json`, "application/json");
  }

  if (format === "csv" && Object.hasOwn(CSV_SECTIONS, what)) {
    const rows = await CSV_SECTIONS[what](userId, params);
    return download(toCsv(rows), `tulsi-${what}-${today}.csv`, "text/csv");
  }

  return NextResponse.json(
    { error: "Use format=json, or format=csv with what=work-reports, money, planner or companies" },
    { status: 400 }
  );
}

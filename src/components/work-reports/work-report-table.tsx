"use client";

import { MoreHorizontal, Trash2, Pencil, Users, Plane, Home } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatDay, formatEnumLabel, formatTime } from "@/utils/format";
import { formatCustomValue } from "@/lib/custom-fields";
import { customSortValue } from "@/lib/table-sort";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTableSort, type SortAccessors } from "@/hooks/use-table-sort";
import type { WorkReportWithEmployment, WorkReportTask } from "@/types";

interface WorkReportTableProps {
  reports: WorkReportWithEmployment[];
  onEdit: (report: WorkReportWithEmployment) => void;
  onDelete: (report: WorkReportWithEmployment) => void;
}

const DAY_TYPE_BADGE_CLASSES: Record<string, string> = {
  OFFICE: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  WORK_FROM_HOME: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  HALF_DAY: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

const LEAVE_BADGE_CLASS = "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
const COMPANY_LEAVE_BADGE_CLASS = "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
const MEETING_BADGE_CLASS = "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300";

/** Same project can be repeated on several tasks of one day - show each name once. */
function uniqueValues(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}

function reportTasks(report: WorkReportWithEmployment): WorkReportTask[] {
  return (report.tasks as WorkReportTask[] | null) ?? [];
}

export function WorkReportTable({ reports, onEdit, onDelete }: WorkReportTableProps) {
  // Empty by default, so the table keeps exactly the columns it always had.
  const { data: customFields = [] } = useCustomFields("WORK_REPORT");

  // The task columns list one line per task, so they sort on the first line —
  // the same thing the eye lands on when scanning the column.
  const accessors: SortAccessors<WorkReportWithEmployment, string> = {
    date: (r) => new Date(r.date).getTime(),
    company: (r) => r.employment.company.name,
    type: (r) => (r.isLeave ? (r.isCompanyGranted ? "Company Leave" : "Leave") : r.dayType),
    time: (r) => (r.isLeave ? null : r.timeFrom),
    tasks: (r) => (r.isLeave ? r.leaveReason : r.hasNoTask ? r.noTaskNote : reportTasks(r)[0]?.task),
    project: (r) => (r.hasNoTask ? null : uniqueValues(reportTasks(r).map((t) => t.projectName))[0]),
    assignedBy: (r) => (r.hasNoTask ? null : reportTasks(r)[0]?.assignedBy),
    notes: (r) => r.notes,
    ...Object.fromEntries(
      customFields.map((field) => [
        field.id,
        (r: WorkReportWithEmployment) => customSortValue(field, r.customValues[field.id]),
      ])
    ),
  };

  const { sorted, toggle, directionOf } = useTableSort(reports, accessors);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead direction={directionOf("date")} onSort={() => toggle("date")}>
              Date
            </SortableTableHead>
            <SortableTableHead direction={directionOf("company")} onSort={() => toggle("company")}>
              Company
            </SortableTableHead>
            <SortableTableHead direction={directionOf("type")} onSort={() => toggle("type")}>
              Type
            </SortableTableHead>
            <SortableTableHead direction={directionOf("time")} onSort={() => toggle("time")}>
              Time
            </SortableTableHead>
            <SortableTableHead direction={directionOf("tasks")} onSort={() => toggle("tasks")}>
              Tasks
            </SortableTableHead>
            <SortableTableHead direction={directionOf("project")} onSort={() => toggle("project")}>
              Project
            </SortableTableHead>
            <SortableTableHead
              direction={directionOf("assignedBy")}
              onSort={() => toggle("assignedBy")}
            >
              Assigned By
            </SortableTableHead>
            <SortableTableHead direction={directionOf("notes")} onSort={() => toggle("notes")}>
              Notes
            </SortableTableHead>
            {customFields.map((field) => (
              <SortableTableHead
                key={field.id}
                direction={directionOf(field.id)}
                onSort={() => toggle(field.id)}
              >
                {field.name}
              </SortableTableHead>
            ))}
            <TableHead className="w-10 border-l" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((report) => {
            const tasks = reportTasks(report);
            const isLongVacation =
              report.isLeave &&
              !!report.leaveFrom &&
              !!report.leaveTo &&
              new Date(report.leaveTo).toDateString() !== new Date(report.leaveFrom).toDateString();
            const projectNames = report.hasNoTask ? [] : uniqueValues(tasks.map((t) => t.projectName));
            const isWfhSpan =
              !report.isLeave &&
              report.dayType === "WORK_FROM_HOME" &&
              !!report.wfhFrom &&
              !!report.wfhTo &&
              new Date(report.wfhTo).toDateString() !== new Date(report.wfhFrom).toDateString();

            return (
              <TableRow key={report.id} className="group/row">
                <TableCell>
                  <div className="font-medium">{formatDate(report.date)}</div>
                  <div className="text-xs text-muted-foreground">{formatDay(report.date)}</div>
                </TableCell>
                <TableCell>
                  {report.employment.company.name}
                  {report.employment.designation && (
                    <span className="text-muted-foreground"> — {report.employment.designation}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {report.isLeave ? (
                      <Badge
                        variant="secondary"
                        className={report.isCompanyGranted ? COMPANY_LEAVE_BADGE_CLASS : LEAVE_BADGE_CLASS}
                      >
                        <Plane className="size-3" /> {report.isCompanyGranted ? "Company Leave" : "Leave"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className={DAY_TYPE_BADGE_CLASSES[report.dayType]}>
                        {formatEnumLabel(report.dayType)}
                      </Badge>
                    )}
                    {report.hasMeeting && (
                      <Badge
                        variant="secondary"
                        className={MEETING_BADGE_CLASS}
                        title={[report.meetingWith, report.meetingTopic].filter(Boolean).join(" — ") || undefined}
                      >
                        <Users className="size-3" /> Meeting
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {!report.isLeave && (report.timeFrom || report.timeTo)
                    ? `${formatTime(report.timeFrom) || "—"} to ${formatTime(report.timeTo) || "—"}`
                    : "—"}
                </TableCell>
                <TableCell>
                  {report.isLeave ? (
                    <span className="text-muted-foreground">{report.leaveReason || "—"}</span>
                  ) : report.hasNoTask ? (
                    <span className="text-muted-foreground">No task — {report.noTaskNote || "—"}</span>
                  ) : tasks.length > 0 ? (
                    <ol className="list-decimal space-y-0.5 pl-4">
                      {tasks.map((t, i) => (
                        <li key={i}>
                          {t.task}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {projectNames.length > 0 ? (
                    <div className="space-y-0.5">
                      {projectNames.map((name) => (
                        <div key={name}>{name}</div>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {!report.hasNoTask && tasks.length > 0 ? (
                    <div className="space-y-0.5">
                      {tasks.map((t, i) => (
                        <div key={i}>{t.assignedBy || "—"}</div>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="space-y-1">
                    {report.hasMeeting && (
                      <div className="flex items-start gap-1 text-xs">
                        <Users className="mt-0.5 size-3 shrink-0" />
                        <span>
                          {report.meetingWith && <span>{report.meetingWith}</span>}
                          {report.meetingWith && report.meetingTopic && " — "}
                          {report.meetingTopic}
                          {!report.meetingWith && !report.meetingTopic && "Meeting"}
                        </span>
                      </div>
                    )}
                    {isLongVacation && (
                      <div className="flex items-start gap-1 text-xs">
                        <Plane className="mt-0.5 size-3 shrink-0" />
                        <span>Till {formatDate(report.leaveTo!)}</span>
                      </div>
                    )}
                    {isWfhSpan && (
                      <div className="flex items-start gap-1 text-xs">
                        <Home className="mt-0.5 size-3 shrink-0" />
                        <span>
                          WFH: {formatDate(report.wfhFrom!)} – {formatDate(report.wfhTo!)}
                        </span>
                      </div>
                    )}
                    {report.notes || (!report.hasMeeting && !isLongVacation && !isWfhSpan && "—")}
                  </div>
                </TableCell>
                {customFields.map((field) => (
                  <TableCell key={field.id} className="text-muted-foreground">
                    {formatCustomValue(field, report.customValues[field.id])}
                  </TableCell>
                ))}
                <TableCell className="border-l">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(report)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(report)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

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
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTableSort } from "@/hooks/use-table-sort";
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

  // Date is the only column worth reordering by — the rest read down the page
  // in the order the days happened.
  const { sorted, toggle, directionOf } = useTableSort(reports, {
    date: (report: WorkReportWithEmployment) => new Date(report.date).getTime(),
  });

  return (
    <div className="rounded-md border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <SortableTableHead
              className="w-[8%]"
              direction={directionOf("date")}
              onSort={() => toggle("date")}
            >
              Date
            </SortableTableHead>
            <TableHead className="w-[12%]">Company</TableHead>
            <TableHead className="w-[9%]">Type</TableHead>
            <TableHead className="w-[8%]">Time</TableHead>
            <TableHead className="w-[24%]">Tasks</TableHead>
            <TableHead className="w-[10%]">Project</TableHead>
            <TableHead className="w-[10%]">Assigned By</TableHead>
            <TableHead className="w-[15%]">Notes</TableHead>
            {customFields.map((field) => (
              <TableHead key={field.id} className="w-[10%]">
                {field.name}
              </TableHead>
            ))}
            <TableHead className="w-[4%] border-l" />
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

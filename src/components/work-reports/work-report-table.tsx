"use client";

import { MoreHorizontal, Trash2, Pencil, Users, Plane } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatDay, formatEnumLabel, formatTime } from "@/utils/format";
import type { WorkReportWithEmployment, WorkReportTask } from "@/types";

interface WorkReportTableProps {
  reports: WorkReportWithEmployment[];
  onEdit: (report: WorkReportWithEmployment) => void;
  onDelete: (report: WorkReportWithEmployment) => void;
}

export function WorkReportTable({ reports, onEdit, onDelete }: WorkReportTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="min-w-64">Tasks</TableHead>
            <TableHead className="min-w-32">Assigned By</TableHead>
            <TableHead className="min-w-48">Notes</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const tasks = (report.tasks as WorkReportTask[] | null) ?? [];
            const isLongVacation =
              report.isLeave &&
              !!report.leaveFrom &&
              !!report.leaveTo &&
              new Date(report.leaveTo).toDateString() !== new Date(report.leaveFrom).toDateString();

            return (
              <TableRow key={report.id}>
                <TableCell>
                  <div className="font-medium">{formatDate(report.date)}</div>
                  <div className="text-xs text-muted-foreground">{formatDay(report.date)}</div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {report.employment.company.name}
                  {report.employment.designation && (
                    <span className="text-muted-foreground"> — {report.employment.designation}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {report.isLeave ? (
                      <Badge variant="secondary">
                        <Plane className="size-3" /> Leave
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{formatEnumLabel(report.dayType)}</Badge>
                    )}
                    {report.hasMeeting && (
                      <Badge
                        variant="secondary"
                        title={[report.meetingWith, report.meetingTopic].filter(Boolean).join(" — ") || undefined}
                      >
                        <Users className="size-3" /> Meeting
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {report.timeFrom || report.timeTo
                    ? `${formatTime(report.timeFrom) || "—"} to ${formatTime(report.timeTo) || "—"}`
                    : "—"}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {report.isLeave ? (
                    <span className="text-muted-foreground">{report.leaveReason || "—"}</span>
                  ) : report.hasNoTask ? (
                    <span className="text-muted-foreground">No task — {report.noTaskNote || "—"}</span>
                  ) : tasks.length > 0 ? (
                    <ol className="list-decimal space-y-0.5 pl-4">
                      {tasks.map((t, i) => (
                        <li key={i}>
                          {t.task}
                          {t.projectName && <span className="text-muted-foreground"> · {t.projectName}</span>}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
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
                <TableCell className="whitespace-normal text-muted-foreground">
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
                    {report.notes || (!report.hasMeeting && !isLongVacation && "—")}
                  </div>
                </TableCell>
                <TableCell>
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

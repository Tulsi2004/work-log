"use client";

import { MoreHorizontal, Trash2, Pencil, Users, Plane } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatDay, formatEnumLabel } from "@/utils/format";
import type { WorkReportWithEmployment, WorkReportTask } from "@/types";

interface WorkReportCardProps {
  report: WorkReportWithEmployment;
  onEdit: (report: WorkReportWithEmployment) => void;
  onDelete: (report: WorkReportWithEmployment) => void;
}

export function WorkReportCard({ report, onEdit, onDelete }: WorkReportCardProps) {
  const tasks = (report.tasks as WorkReportTask[] | null) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-0.5">
          <span>{formatDate(report.date)}</span>
          <span className="text-xs font-normal text-muted-foreground">{formatDay(report.date)}</span>
        </CardTitle>
        <CardAction>
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
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            {report.employment.company.name}
            {report.employment.designation && ` — ${report.employment.designation}`}
          </Badge>
          <Badge variant="secondary">{formatEnumLabel(report.dayType)}</Badge>
          {report.isLeave && (
            <Badge variant="secondary">
              <Plane className="size-3" /> Leave
            </Badge>
          )}
          {report.hasMeeting && (
            <Badge variant="secondary">
              <Users className="size-3" /> Meeting
            </Badge>
          )}
        </div>

        {(report.timeFrom || report.timeTo) && (
          <p className="text-muted-foreground">
            {report.timeFrom || "—"} to {report.timeTo || "—"}
          </p>
        )}

        {report.hasNoTask ? (
          <p className="mt-1 text-muted-foreground">No task — {report.noTaskNote || "—"}</p>
        ) : tasks.length > 0 ? (
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            {tasks.map((t, i) => (
              <li key={i}>
                {t.task}
                {t.projectName && <span className="text-muted-foreground"> · {t.projectName}</span>}
              </li>
            ))}
          </ol>
        ) : null}

        {report.notes && (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-muted-foreground">{report.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

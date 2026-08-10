"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatDateTime, formatEnumLabel } from "@/utils/format";
import type { Note } from "@/types";

interface NoteCardProps {
  note: Note;
  onDelete: (note: Note) => void;
}

function CategorySummary({ note }: { note: Note }) {
  switch (note.category) {
    case "ATTENDANCE":
      return (
        <p className="text-muted-foreground">
          {note.attendanceStatus ? formatEnumLabel(note.attendanceStatus) : "—"}
          {(note.checkIn || note.checkOut) && (
            <> · {note.checkIn || "—"} to {note.checkOut || "—"}</>
          )}
        </p>
      );
    case "COMPANY":
      return (
        <p className="text-muted-foreground">
          {note.companyName || "Untitled company"}
          {note.companyStatus && <> · {formatEnumLabel(note.companyStatus)}</>}
        </p>
      );
    case "PROJECT":
      return (
        <p className="text-muted-foreground">
          {note.projectName || "Untitled project"}
          {note.projectStatus && <> · {formatEnumLabel(note.projectStatus)}</>}
        </p>
      );
    case "WORK_LOG":
      return (
        <p className="text-muted-foreground">
          {note.workLogDate && <>{formatDate(note.workLogDate)} · </>}
          {note.hoursWorked != null && <>{note.hoursWorked}h</>}
          {note.workLogStatus && <> · {formatEnumLabel(note.workLogStatus)}</>}
        </p>
      );
    default:
      return null;
  }
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="line-clamp-1">{note.title || "Untitled"}</CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(note)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary" className="mb-2">
          {formatEnumLabel(note.category)}
        </Badge>
        <CategorySummary note={note} />
        {note.content && (
          <p className="line-clamp-5 whitespace-pre-wrap text-muted-foreground">{note.content}</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground/70">{formatDateTime(note.updatedAt)}</p>
      </CardContent>
    </Card>
  );
}

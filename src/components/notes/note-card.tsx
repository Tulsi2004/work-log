"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime, formatEnumLabel } from "@/utils/format";
import type { Note } from "@/types";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <Card className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => onEdit(note)}>
      <CardHeader>
        <CardTitle className="line-clamp-1">{note.title || "Untitled"}</CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(note)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
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
        <p className="line-clamp-5 whitespace-pre-wrap text-muted-foreground">{note.content}</p>
        <p className="mt-3 text-xs text-muted-foreground/70">{formatDateTime(note.updatedAt)}</p>
      </CardContent>
    </Card>
  );
}

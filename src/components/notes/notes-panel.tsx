"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoteFormDialog } from "@/components/notes/note-form";
import { NoteCard } from "@/components/notes/note-card";
import { useNotes } from "@/hooks/use-notes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { deleteNote } from "@/actions/note-actions";
import { NOTE_CATEGORIES } from "@/lib/validations/note";
import { formatEnumLabel } from "@/utils/format";
import type { Note } from "@/types";

export function NotesPanel() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [category, setCategory] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

  const queryClient = useQueryClient();
  const { data, isLoading } = useNotes(debouncedSearch, category === "all" ? undefined : category);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      toast.success("Note deleted");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete note"),
  });

  const notes = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="pl-8"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {NOTE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {formatEnumLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setEditingNote(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          New Note
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes yet. Write your first one instead of reaching for Word or Excel.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={(n) => {
                setEditingNote(n);
                setFormOpen(true);
              }}
              onDelete={(n) => {
                if (confirm(`Delete "${n.title || "this note"}"?`)) {
                  deleteMutation.mutate(n.id);
                }
              }}
            />
          ))}
        </div>
      )}

      <NoteFormDialog open={formOpen} onOpenChange={setFormOpen} note={editingNote} />
    </div>
  );
}

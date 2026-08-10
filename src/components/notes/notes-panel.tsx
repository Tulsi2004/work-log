"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteCard } from "@/components/notes/note-card";
import { useNotes } from "@/hooks/use-notes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { deleteNote } from "@/actions/note-actions";

export function NotesPanel() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const queryClient = useQueryClient();
  const { data, isLoading } = useNotes(debouncedSearch);

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
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-8"
          />
        </div>
        <Button>
          <Plus className="size-4" />
          Add Note
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
              onDelete={(n) => {
                if (confirm(`Delete "${n.title || "this note"}"?`)) {
                  deleteMutation.mutate(n.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

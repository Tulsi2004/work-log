"use client";

import { useState } from "react";
import Link from "next/link";
import { StickyNote, Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteFormDialog } from "@/components/notes/note-form";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { formatDateTime } from "@/utils/format";

export default function DashboardPage() {
  const { data, isLoading } = useDashboardStats();
  const [noteFormOpen, setNoteFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your notes, at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/notes">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notes</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-10" />
                ) : (
                  <p className="text-2xl font-semibold">{data?.totalNotes ?? 0}</p>
                )}
              </div>
              <StickyNote className="size-8 text-muted-foreground/40" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump straight into writing.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setNoteFormOpen(true)}>
            <Plus className="size-4" />
            New Note
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notes</CardTitle>
          <CardDescription>Your latest entries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : data?.recentNotes.length ? (
            data.recentNotes.map((note) => (
              <Link
                key={note.id}
                href="/notes"
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <p className="truncate text-sm font-medium">{note.title || "Untitled"}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{note.content}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">{formatDateTime(note.updatedAt)}</p>
              </Link>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No notes yet. Add your first one above.
            </p>
          )}
        </CardContent>
      </Card>

      <NoteFormDialog open={noteFormOpen} onOpenChange={setNoteFormOpen} />
    </div>
  );
}

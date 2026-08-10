import { NotesPanel } from "@/components/notes/notes-panel";

export default function NotesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Notes</h1>
        <p className="text-sm text-muted-foreground">Freeform notes, right on your dashboard.</p>
      </div>
      <NotesPanel />
    </div>
  );
}

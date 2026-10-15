import { EditEventEditor } from "@/components/calendar/event-editor";

export default async function EditEventPage({ params }: PageProps<"/calendar/event/[occurrenceId]/edit">) {
  const { occurrenceId } = await params;
  return <EditEventEditor occurrenceId={decodeURIComponent(occurrenceId)} />;
}

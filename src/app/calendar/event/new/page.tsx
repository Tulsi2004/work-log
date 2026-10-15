import { NewEventEditor } from "@/components/calendar/event-editor";

export default async function NewEventPage({ searchParams }: PageProps<"/calendar/event/new">) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  return (
    <NewEventEditor
      prefill={{
        start: one("start"),
        end: one("end"),
        allDay: one("allDay") === "1",
        title: one("title"),
        calendarId: one("calendarId"),
        description: one("description"),
        location: one("location"),
        rrule: one("rrule"),
        color: one("color"),
        tz: one("tz"),
      }}
    />
  );
}

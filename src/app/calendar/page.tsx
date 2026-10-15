import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { calendarPath, dateKeyInTz, parseDateKey } from "@/lib/calendar/dates";
import { loadSettings } from "@/lib/calendar/settings";

/** /calendar opens the default view at today, in the user's time zone. */
export default async function CalendarIndex() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const { settings } = await loadSettings(userId);
  redirect(calendarPath(settings.defaultView, parseDateKey(dateKeyInTz(new Date(), settings.timezone))));
}

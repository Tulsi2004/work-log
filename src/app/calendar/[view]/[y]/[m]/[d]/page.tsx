import { notFound } from "next/navigation";
import { isViewKey } from "@/lib/calendar/dates";
import { routeDate } from "@/lib/calendar/routes";

// The view itself is drawn by CalendarShell so it stays mounted while the date changes;
// this page only rejects URLs that aren't a view and a real date.
export default async function CalendarViewPage({ params }: PageProps<"/calendar/[view]/[y]/[m]/[d]">) {
  const { view, y, m, d } = await params;
  if (!isViewKey(view) || !routeDate(y, m, d)) notFound();
  return null;
}

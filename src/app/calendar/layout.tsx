import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/navbar";
import { CalendarShell } from "@/components/calendar/calendar-shell";
import { CalendarProvider } from "@/hooks/calendar/use-calendar-settings";
import { ensureCalendars, loadSettings } from "@/lib/calendar/settings";

export const metadata: Metadata = { title: "Calendar · TULSI" };

export default async function CalendarLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const [{ settings, isNew }, calendars] = await Promise.all([loadSettings(userId), ensureCalendars(userId)]);
  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      <CalendarProvider settings={settings} calendars={calendars}>
        <CalendarShell detectTimezone={isNew}>{children}</CalendarShell>
      </CalendarProvider>
    </div>
  );
}

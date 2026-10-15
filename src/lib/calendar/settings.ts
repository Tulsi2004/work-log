import { currentUser } from "@clerk/nextjs/server";
import type { Calendar } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDaysToKey } from "./dates";
import holidayData from "./holidays-in-2026.json";
import type { CalendarDTO, CalendarSettings } from "./types";
import { settingsPatchSchema } from "./validators";

// Kept in UserPreference like the other per-user settings, not a table of their own.
const KEY = "calendar";

export const DEFAULT_SETTINGS: CalendarSettings = {
  timezone: "Asia/Kolkata",
  weekStartsOn: 0,
  showWeekends: true,
  defaultView: "week",
  defaultEventDuration: 60,
  timeFormat: "H12",
};

/** The user's settings over the defaults; `isNew` until they have saved any. */
export async function loadSettings(userId: string) {
  const row = await prisma.userPreference.findUnique({ where: { userId_key: { userId, key: KEY } } });
  const stored = settingsPatchSchema.safeParse(row?.value ?? {});
  return { settings: { ...DEFAULT_SETTINGS, ...(stored.success ? stored.data : {}) }, isNew: !row };
}

export async function saveSettings(userId: string, patch: Partial<CalendarSettings>) {
  const { settings } = await loadSettings(userId);
  const value = { ...settings, ...patch };
  await prisma.userPreference.upsert({
    where: { userId_key: { userId, key: KEY } },
    create: { userId, key: KEY, value },
    update: { value },
  });
  return value;
}

export const toCalendarDTO = ({ userId: _userId, ...cal }: Calendar): CalendarDTO => cal;

/** The user's calendars, creating their own one and the holidays one on the first visit. */
export async function ensureCalendars(userId: string) {
  const existing = await prisma.calendar.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } });
  if (existing.length) return existing.map(toCalendarDTO);
  const user = await currentUser();
  const name = user?.fullName || user?.firstName || "My calendar";
  await prisma.$transaction(async (tx) => {
    // Two first requests at once must not both create the defaults.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    if (await tx.calendar.count({ where: { userId } })) return;
    await tx.calendar.create({ data: { userId, name, color: "#039be5", isPrimary: true, sortOrder: 0 } });
    await tx.calendar.create({
      data: {
        userId,
        name: "Holidays in India",
        description: "Holidays and observances in India",
        color: "#0b8043",
        kind: "HOLIDAY",
        isReadOnly: true,
        sortOrder: 1,
        events: {
          create: holidayData.holidays.map((h) => ({
            title: h.name,
            isAllDay: true,
            startDate: h.date,
            endDate: addDaysToKey(h.date, 1),
            timezone: "Asia/Kolkata",
          })),
        },
      },
    });
  });
  const created = await prisma.calendar.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } });
  return created.map(toCalendarDTO);
}

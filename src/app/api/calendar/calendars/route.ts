import { prisma } from "@/lib/prisma";
import { handler, readJson } from "@/lib/calendar/api";
import { ensureCalendars, toCalendarDTO } from "@/lib/calendar/settings";
import { calendarCreateSchema } from "@/lib/calendar/validators";

export const GET = handler(async ({ userId }) => ensureCalendars(userId));

export const POST = handler(async ({ req, userId }) => {
  const input = calendarCreateSchema.parse(await readJson(req));
  const last = await prisma.calendar.aggregate({ where: { userId }, _max: { sortOrder: true } });
  const cal = await prisma.calendar.create({
    data: { ...input, userId, kind: "OWNED", sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
  return toCalendarDTO(cal);
});

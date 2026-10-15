import { prisma } from "@/lib/prisma";
import { HttpError, handler, ownedCalendar, readJson } from "@/lib/calendar/api";
import { toCalendarDTO } from "@/lib/calendar/settings";
import { calendarPatchSchema } from "@/lib/calendar/validators";

export const PATCH = handler<{ id: string }>(async ({ req, userId, params }) => {
  const patch = calendarPatchSchema.parse(await readJson(req));
  const cal = await ownedCalendar(userId, params.id);
  if (cal.isReadOnly && (patch.name !== undefined || patch.description !== undefined))
    throw new HttpError(403, "This calendar is read-only");
  return toCalendarDTO(await prisma.calendar.update({ where: { id: cal.id }, data: patch }));
});

export const DELETE = handler<{ id: string }>(async ({ userId, params }) => {
  const cal = await ownedCalendar(userId, params.id);
  if (cal.isPrimary) throw new HttpError(403, "This calendar can't be deleted");
  await prisma.calendar.delete({ where: { id: cal.id } });
});

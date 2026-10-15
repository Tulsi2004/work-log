import { HttpError, handler, ownedCalendar, readJson } from "@/lib/calendar/api";
import { createEvent, occurrencesInRange } from "@/lib/calendar/events";
import { loadSettings } from "@/lib/calendar/settings";
import { eventCreateSchema, timeZoneSchema } from "@/lib/calendar/validators";

const MAX_RANGE_MS = 400 * 86_400_000;

export const GET = handler(async ({ req, userId }) => {
  const params = new URL(req.url).searchParams;
  const start = new Date(params.get("start") ?? "");
  const end = new Date(params.get("end") ?? "");
  if (isNaN(+start) || isNaN(+end) || end <= start) throw new HttpError(400, "Pass start and end as ISO dates");
  if (+end - +start > MAX_RANGE_MS) throw new HttpError(400, "That range is too long");
  const tz = params.get("tz") ? timeZoneSchema.parse(params.get("tz")) : (await loadSettings(userId)).settings.timezone;
  return occurrencesInRange(userId, start, end, tz);
});

export const POST = handler(async ({ req, userId }) => {
  const input = eventCreateSchema.parse(await readJson(req));
  await ownedCalendar(userId, input.calendarId, { writable: true });
  const { id } = await createEvent(input);
  return { id };
});

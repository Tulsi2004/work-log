import { HttpError, handler } from "@/lib/calendar/api";
import { searchEvents } from "@/lib/calendar/events";
import { loadSettings } from "@/lib/calendar/settings";
import { timeZoneSchema } from "@/lib/calendar/validators";

export const GET = handler(async ({ req, userId }) => {
  const qs = new URL(req.url).searchParams;
  const q = qs.get("q")?.trim() ?? "";
  if (!q || q.length > 200) throw new HttpError(400, "Search for 1–200 characters");
  const tz = qs.get("tz") ? timeZoneSchema.parse(qs.get("tz")) : (await loadSettings(userId)).settings.timezone;
  return searchEvents(userId, q, tz);
});

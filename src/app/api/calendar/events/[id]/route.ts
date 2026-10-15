import { handler, readJson } from "@/lib/calendar/api";
import { deleteEvent, eventWithOccurrence, patchEvent } from "@/lib/calendar/events";
import { loadSettings } from "@/lib/calendar/settings";
import { eventPatchSchema, scopeSchema, timeZoneSchema } from "@/lib/calendar/validators";

const optionalDate = (v: string | null) => (v ? new Date(v) : null);

export const GET = handler<{ id: string }>(async ({ req, userId, params }) => {
  const qs = new URL(req.url).searchParams;
  const tz = qs.get("tz") ? timeZoneSchema.parse(qs.get("tz")) : (await loadSettings(userId)).settings.timezone;
  return eventWithOccurrence(userId, params.id, optionalDate(qs.get("originalStart")), tz);
});

export const PATCH = handler<{ id: string }>(async ({ req, userId, params }) =>
  patchEvent(userId, params.id, eventPatchSchema.parse(await readJson(req))),
);

export const DELETE = handler<{ id: string }>(async ({ req, userId, params }) => {
  const qs = new URL(req.url).searchParams;
  const scope = scopeSchema.parse(qs.get("scope") ?? "all");
  return deleteEvent(userId, params.id, scope, optionalDate(qs.get("originalStart")));
});

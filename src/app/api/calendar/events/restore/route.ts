import { handler, readJson } from "@/lib/calendar/api";
import { restoreEvents } from "@/lib/calendar/events";
import { restoreSchema } from "@/lib/calendar/validators";

// Undo: puts events back exactly as the snapshots taken before a change.
export const POST = handler(async ({ req, userId }) => {
  const { snapshots, deleteIds } = restoreSchema.parse(await readJson(req));
  await restoreEvents(userId, snapshots, deleteIds);
});

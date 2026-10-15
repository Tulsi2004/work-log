import { handler, readJson } from "@/lib/calendar/api";
import { loadSettings, saveSettings } from "@/lib/calendar/settings";
import { settingsPatchSchema } from "@/lib/calendar/validators";

export const GET = handler(async ({ userId }) => (await loadSettings(userId)).settings);

export const PATCH = handler(async ({ req, userId }) =>
  saveSettings(userId, settingsPatchSchema.parse(await readJson(req))),
);

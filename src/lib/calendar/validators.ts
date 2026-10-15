import { z } from "zod";
import { isValidTimeZone, VIEWS } from "./dates";
import { isValidRRule } from "./recurrence";

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid colour");
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const timeZoneSchema = z.string().refine(isValidTimeZone, "Unknown time zone");
const rruleSchema = z.string().max(500).refine(isValidRRule, "Invalid recurrence rule");
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => v?.trim() || null);

// ---------- events ----------
const eventFields = {
  calendarId: z.string().min(1),
  title: z
    .string()
    .max(1000)
    .transform((v) => v.trim() || "(No title)"),
  description: optionalText(8000),
  location: optionalText(1000),
  color: hexColor.nullish(),
  isAllDay: z.boolean(),
  startAt: z.coerce.date().nullish(),
  endAt: z.coerce.date().nullish(),
  timezone: timeZoneSchema,
  startDate: dateKeySchema.nullish(),
  endDate: dateKeySchema.nullish(),
  rrule: rruleSchema.nullish(),
};

type Timing = {
  isAllDay?: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
  startDate?: string | null;
  endDate?: string | null;
};
/** Returns an error message if the timing fields are inconsistent. */
export function timingError(e: Timing): string | null {
  if (e.isAllDay) {
    if (!e.startDate || !e.endDate) return "All-day events need startDate and endDate";
    if (e.endDate <= e.startDate) return "endDate must be after startDate (it is exclusive)";
  } else {
    if (!e.startAt || !e.endAt) return "Timed events need startAt and endAt";
    if (e.endAt <= e.startAt) return "The event must end after it starts";
  }
  return null;
}
const refineTiming = (e: Timing, ctx: z.RefinementCtx) => {
  const err = timingError(e);
  if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
};

export const eventCreateSchema = z
  .object({ ...eventFields, title: eventFields.title.default("(No title)") })
  .superRefine(refineTiming);
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

export const scopeSchema = z.enum(["this", "following", "all"]);
export type Scope = z.infer<typeof scopeSchema>;

export const eventPatchSchema = z.object(eventFields).partial().extend({
  scope: scopeSchema.default("all"),
  originalStart: z.coerce.date().nullish(),
});
export type EventPatchInput = z.infer<typeof eventPatchSchema>;

const exceptionSnapshot = z.object({
  originalStart: z.coerce.date(),
  isCancelled: z.boolean(),
  title: z.string().max(1000).nullable(),
  description: z.string().max(8000).nullable(),
  location: z.string().max(1000).nullable(),
  color: hexColor.nullable(),
  startAt: z.coerce.date().nullable(),
  endAt: z.coerce.date().nullable(),
  startDate: dateKeySchema.nullable(),
  endDate: dateKeySchema.nullable(),
});

/** A full event as returned by the API, used to undo deletes and moves. */
export const eventSnapshotSchema = z
  .object({
    id: z.string().min(1).max(50),
    ...eventFields,
    exceptions: z.array(exceptionSnapshot).max(1000),
  })
  .superRefine(refineTiming);
export type EventSnapshot = z.infer<typeof eventSnapshotSchema>;

export const restoreSchema = z.object({
  snapshots: z.array(eventSnapshotSchema).max(10),
  deleteIds: z.array(z.string()).max(10),
});

// ---------- calendars ----------
export const calendarCreateSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(200),
  description: optionalText(2000),
  color: hexColor,
});
export const calendarPatchSchema = calendarCreateSchema.partial().extend({
  isVisible: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ---------- settings ----------
export const EVENT_DURATIONS = [15, 30, 45, 60, 90, 120] as const;
export const settingsPatchSchema = z
  .object({
    timezone: timeZoneSchema,
    weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]),
    showWeekends: z.boolean(),
    defaultView: z.enum(VIEWS),
    defaultEventDuration: z.number().refine((n) => (EVENT_DURATIONS as readonly number[]).includes(n)),
    timeFormat: z.enum(["H12", "H24"]),
  })
  .partial();

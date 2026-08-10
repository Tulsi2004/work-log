import { z } from "zod";

export const NOTE_CATEGORIES = [
  "GENERAL",
  "WORK",
  "PERSONAL",
  "IDEAS",
  "REFERENCE",
  "ATTENDANCE",
  "COMPANY",
  "PROJECT",
  "WORK_LOG",
] as const;

export const noteSchema = z.object({
  title: z.string().max(150).optional().or(z.literal("")),
  content: z.string().min(1, "Write something first").max(20000),
  category: z.enum(NOTE_CATEGORIES),
});

export type NoteInput = z.infer<typeof noteSchema>;

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

// Categories with structured fields of their own — the free-text content field is optional for these.
export const STRUCTURED_CATEGORIES: readonly string[] = ["ATTENDANCE", "COMPANY", "PROJECT", "WORK_LOG"];

// Grouping for the category dropdowns — generic note categories vs. structured tracking categories.
export const NOTE_CATEGORY_GROUPS = [
  { label: "General", categories: ["GENERAL", "WORK", "PERSONAL", "IDEAS", "REFERENCE"] as const },
  { label: "Tracking", categories: ["ATTENDANCE", "COMPANY", "PROJECT", "WORK_LOG"] as const },
] as const;

export const ATTENDANCE_STATUSES = ["PRESENT", "HALF_DAY", "LEAVE", "HOLIDAY", "WORK_FROM_HOME"] as const;
export const COMPANY_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const PROJECT_STATUSES = ["ACTIVE", "COMPLETED", "ON_HOLD"] as const;
export const WORK_LOG_STATUSES = ["COMPLETED", "IN_PROGRESS", "PENDING"] as const;

const optionalString = z.string().optional().or(z.literal(""));

export const noteSchema = z
  .object({
    title: z.string().max(150).optional().or(z.literal("")),
    content: z.string().max(20000).optional().or(z.literal("")),
    category: z.enum(NOTE_CATEGORIES),

    attendanceStatus: z.enum(ATTENDANCE_STATUSES).optional(),
    checkIn: optionalString,
    checkOut: optionalString,
    breakIn: optionalString,
    breakOut: optionalString,

    companyName: optionalString,
    companyStatus: z.enum(COMPANY_STATUSES).optional(),

    projectName: optionalString,
    projectStatus: z.enum(PROJECT_STATUSES).optional(),
    projectStartDate: optionalString,
    projectEndDate: optionalString,

    workLogDate: optionalString,
    hoursWorked: optionalString,
    workLogStatus: z.enum(WORK_LOG_STATUSES).optional(),
  })
  .superRefine((data, ctx) => {
    if (!STRUCTURED_CATEGORIES.includes(data.category) && !data.content) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Write something first", path: ["content"] });
    }
    if (data.category === "ATTENDANCE" && !data.attendanceStatus) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a status", path: ["attendanceStatus"] });
    }
    if (data.category === "COMPANY" && !data.companyName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company name is required", path: ["companyName"] });
    }
    if (data.category === "PROJECT" && !data.projectName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Project name is required", path: ["projectName"] });
    }
    if (data.category === "WORK_LOG") {
      if (!data.workLogDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date is required", path: ["workLogDate"] });
      }
      if (!data.hoursWorked) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hours worked is required", path: ["hoursWorked"] });
      }
    }
    if (data.hoursWorked) {
      const n = Number(data.hoursWorked);
      if (Number.isNaN(n) || n < 0 || n > 24) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a number between 0 and 24", path: ["hoursWorked"] });
      }
    }
  });

export type NoteInput = z.infer<typeof noteSchema>;

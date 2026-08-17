import { z } from "zod";

export const PAYMENT_TYPES = ["LUMPSUM", "MONTHLY"] as const;
export const DAY_TYPES = ["OFFICE", "WORK_FROM_HOME", "HALF_DAY"] as const;
export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"] as const;

const optionalString = z.string().optional().or(z.literal(""));

const payRateSchema = z.object({
  actualSalary: z
    .string()
    .min(1, "Actual salary is required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid amount"),
  pf: optionalString.refine(
    (v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0),
    "Enter a valid amount"
  ),
  inHandSalary: z
    .string()
    .min(1, "In-hand salary is required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid amount"),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});

export type PayRateInput = z.infer<typeof payRateSchema>;

export const employmentSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required").max(150),
    ceoName: optionalString,
    jobSource: optionalString,
    designation: optionalString,
    employmentType: z.enum(EMPLOYMENT_TYPES),
    since: optionalString,
    until: optionalString,
    paymentType: z.enum(PAYMENT_TYPES),
    payHistory: z.array(payRateSchema).min(1, "Add at least one pay entry"),
  })
  .superRefine((data, ctx) => {
    if (data.since && data.until && data.until < data.since) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date must be after start date", path: ["until"] });
    }
  });

export type EmploymentInput = z.infer<typeof employmentSchema>;

const taskSchema = z.object({
  task: z.string().max(300),
  projectName: optionalString,
  assignedBy: optionalString,
});

export const workReportSchema = z
  .object({
    employmentId: z.string().min(1, "Select a company"),
    date: z.string().min(1, "Date is required"),
    timeFrom: optionalString,
    timeTo: optionalString,
    dayType: z.enum(DAY_TYPES),

    isLeave: z.boolean(),
    isLongVacation: z.boolean(),
    leaveFrom: optionalString,
    leaveTo: optionalString,
    leaveReason: optionalString,

    hasMeeting: z.boolean(),
    meetingWith: optionalString,
    meetingTopic: optionalString,

    hasNoTask: z.boolean(),
    noTaskNote: optionalString,
    tasks: z.array(taskSchema),

    notes: optionalString,
  })
  .superRefine((data, ctx) => {
    if (data.hasMeeting && !data.meetingTopic) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add a topic for the meeting", path: ["meetingTopic"] });
    }
    if (data.isLeave) {
      if (data.isLongVacation) {
        if (!data.leaveFrom) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Leave from date is required", path: ["leaveFrom"] });
        }
        if (!data.leaveTo) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Leave to date is required", path: ["leaveTo"] });
        }
        if (data.leaveFrom && data.leaveTo && data.leaveTo < data.leaveFrom) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Leave to date must be after leave from date", path: ["leaveTo"] });
        }
      }
      return;
    }
    if (data.hasNoTask) {
      return;
    }
    if (data.tasks.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one task", path: ["tasks"] });
      return;
    }
    data.tasks.forEach((t, index) => {
      if (!t.task.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Task is required", path: ["tasks", index, "task"] });
      }
    });
  });

export type WorkReportInput = z.infer<typeof workReportSchema>;

import { z } from "zod";

export const PAYMENT_TYPES = ["LUMPSUM", "MONTHLY"] as const;
export const DAY_TYPES = ["OFFICE", "WORK_FROM_HOME", "HALF_DAY"] as const;
export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"] as const;

const optionalString = z.string().optional().or(z.literal(""));

const payRateSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid amount"),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});

export type PayRateInput = z.infer<typeof payRateSchema>;

export const employmentSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required").max(150),
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
  task: z.string().min(1, "Task is required").max(300),
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
    leaveFrom: optionalString,
    leaveTo: optionalString,
    hasMeeting: z.boolean(),
    leaveReason: optionalString,

    hasNoTask: z.boolean(),
    noTaskNote: optionalString,
    tasks: z.array(taskSchema),

    notes: optionalString,
  })
  .superRefine((data, ctx) => {
    if (data.isLeave) {
      if (!data.leaveFrom) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Leave from date is required", path: ["leaveFrom"] });
      }
      if (!data.leaveTo) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Leave to date is required", path: ["leaveTo"] });
      }
    }
    if (data.hasNoTask) {
      if (!data.noTaskNote) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add a reason for no task", path: ["noTaskNote"] });
      }
    } else if (data.tasks.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one task", path: ["tasks"] });
    }
  });

export type WorkReportInput = z.infer<typeof workReportSchema>;

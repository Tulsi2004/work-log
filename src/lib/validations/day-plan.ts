import { z } from "zod";
import { PLAN_LABELS } from "@/lib/plan-labels";
import { customValuesSchema } from "@/lib/validations/custom-field";

const optionalString = z.string().optional().or(z.literal(""));

export const dayPlanSchema = z.object({
  date: z.string().min(1, "Date is required"),
  title: z.string().min(1, "Write what you need to do").max(300),
  detail: optionalString,
  label: z.enum(PLAN_LABELS),
  employmentId: optionalString,
  isDone: z.boolean(),
  customValues: customValuesSchema,
});

export type DayPlanInput = z.infer<typeof dayPlanSchema>;

import { z } from "zod";
import { SPEND_CATEGORIES } from "@/lib/money";
import { customValuesSchema } from "@/lib/validations/custom-field";

const optionalString = z.string().optional().or(z.literal(""));

// Amounts travel as text — the same shape the pay-history inputs use — so a
// half-typed number never becomes NaN before the user is done typing.
const isAmount = (value: string) => !Number.isNaN(Number(value)) && Number(value) >= 0;

const spendSchema = z.object({
  what: z.string().max(200),
  amount: optionalString.refine((v) => !v || isAmount(v), "Enter a valid amount"),
  category: z.enum(SPEND_CATEGORIES),
});

export const salaryEntrySchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    amount: z.string().min(1, "Amount is required").refine(isAmount, "Enter a valid amount"),
    source: optionalString,
    employmentId: optionalString,
    note: optionalString,
    spends: z.array(spendSchema),
    customValues: customValuesSchema,
  })
  .superRefine((data, ctx) => {
    data.spends.forEach((spend, index) => {
      const what = spend.what.trim();
      const amount = (spend.amount ?? "").trim();
      // A row with neither half filled in is just an unused row — the action
      // drops it. A half-filled one is a mistake worth pointing at.
      if (amount && !what) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Say what this was for",
          path: ["spends", index, "what"],
        });
      }
      if (what && !amount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add an amount",
          path: ["spends", index, "amount"],
        });
      }
    });
  });

export type SalaryEntryInput = z.infer<typeof salaryEntrySchema>;
export type SalarySpendInput = z.infer<typeof spendSchema>;

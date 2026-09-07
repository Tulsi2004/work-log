import { z } from "zod";
import { CUSTOM_FIELD_ENTITIES, CUSTOM_FIELD_TYPES } from "@/lib/custom-fields";

export const customFieldSchema = z
  .object({
    entity: z.enum(CUSTOM_FIELD_ENTITIES),
    name: z.string().min(1, "Give the field a name").max(60),
    type: z.enum(CUSTOM_FIELD_TYPES),
    options: z.array(z.object({ value: z.string().max(60) })),
    required: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "SELECT") return;
    const filled = data.options.filter((option) => option.value.trim());
    if (filled.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one choice",
        path: ["options"],
      });
    }
  });

export type CustomFieldInput = z.infer<typeof customFieldSchema>;

// The values a record carries for the user's own fields: fieldId -> text value.
export const customValuesSchema = z.record(z.string(), z.string());

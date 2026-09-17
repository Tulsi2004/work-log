import { z } from "zod";
import { CARD_MEASURES, CARD_PERIODS, CARD_SOURCES, measureNeedsField } from "@/lib/custom-cards";

export const customCardSchema = z
  .object({
    title: z.string().min(1, "Give the card a title").max(40),
    source: z.enum(CARD_SOURCES),
    measure: z.enum(CARD_MEASURES),
    // Blank is only allowed for a plain count — checked below.
    field: z.string().optional().or(z.literal("")),
    period: z.enum(CARD_PERIODS),
    filters: z
      .array(z.object({ field: z.string().min(1), value: z.string().min(1) }))
      .max(5, "Five conditions is plenty for one number"),
  })
  .refine((card) => !measureNeedsField(card.measure) || !!card.field, {
    message: "Choose what to measure",
    path: ["field"],
  });

export type CustomCardInput = z.infer<typeof customCardSchema>;

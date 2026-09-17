import { z } from "zod";

export const planLabelSchema = z.object({
  name: z.string().min(1, "Give the label a name").max(40),
  // Any colour the picker can produce, as #rrggbb.
  colour: z.string().regex(/^#[0-9a-f]{6}$/i, "Pick a colour"),
});

export type PlanLabelInput = z.infer<typeof planLabelSchema>;

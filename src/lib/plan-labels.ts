// The colour vocabulary for day plans — one named label per colour, so a colour
// always means the same thing across the planner (and stays filterable).
export const PLAN_LABELS = [
  "URGENT",
  "CLIENT",
  "FOLLOW_UP",
  "MEETING",
  "IDEA",
  "PERSONAL",
  "GENERAL",
] as const;

export type PlanLabelValue = (typeof PLAN_LABELS)[number];

interface PlanLabelMeta {
  name: string;
  // Badge fill, matching the day-type badges on the work report table.
  badge: string;
  // Solid swatch, for the colour picker and the group headers.
  dot: string;
  // Left edge of a plan row.
  accent: string;
}

export const PLAN_LABEL_META: Record<PlanLabelValue, PlanLabelMeta> = {
  URGENT: {
    name: "Urgent",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
    accent: "border-l-rose-500",
  },
  CLIENT: {
    name: "Client",
    badge: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    dot: "bg-orange-500",
    accent: "border-l-orange-500",
  },
  FOLLOW_UP: {
    name: "Follow-up",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
    accent: "border-l-amber-500",
  },
  MEETING: {
    name: "Meeting",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    dot: "bg-teal-500",
    accent: "border-l-teal-500",
  },
  IDEA: {
    name: "Idea",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    dot: "bg-violet-500",
    accent: "border-l-violet-500",
  },
  PERSONAL: {
    name: "Personal",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    dot: "bg-blue-500",
    accent: "border-l-blue-500",
  },
  GENERAL: {
    name: "General",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
    dot: "bg-slate-400",
    accent: "border-l-slate-400",
  },
};

export function planLabelName(label: string): string {
  return PLAN_LABEL_META[label as PlanLabelValue]?.name ?? label;
}

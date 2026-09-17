import type { CSSProperties } from "react";

// The label vocabulary for day plans. Seven come built in with a fixed palette;
// anything else is a row the user added, carrying whatever colour they picked.

export interface PlanLabelLook {
  id: string;
  name: string;
  /** Badge fill, matching the day-type badges on the work report table. */
  badge: string;
  /** Solid swatch, for the picker and the filter chips. */
  dot: string;
  /** Left edge of a plan row. */
  accent: string;
  /**
   * Set on the element that wears the classes above. Built-in labels leave this
   * undefined — their colours are real Tailwind classes; a user-defined one
   * passes its colour through as `--plan-label`, which globals.css reads.
   */
  style?: CSSProperties;
}

/** The seven that ship with the planner. Their id is the value stored on a plan. */
export const BUILT_IN_PLAN_LABELS: PlanLabelLook[] = [
  {
    id: "URGENT",
    name: "Urgent",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
    accent: "border-l-rose-500",
  },
  {
    id: "CLIENT",
    name: "Client",
    badge: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    dot: "bg-orange-500",
    accent: "border-l-orange-500",
  },
  {
    id: "FOLLOW_UP",
    name: "Follow-up",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
    accent: "border-l-amber-500",
  },
  {
    id: "MEETING",
    name: "Meeting",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    dot: "bg-teal-500",
    accent: "border-l-teal-500",
  },
  {
    id: "IDEA",
    name: "Idea",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    dot: "bg-violet-500",
    accent: "border-l-violet-500",
  },
  {
    id: "PERSONAL",
    name: "Personal",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    dot: "bg-blue-500",
    accent: "border-l-blue-500",
  },
  {
    id: "GENERAL",
    name: "General",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
    dot: "bg-slate-400",
    accent: "border-l-slate-400",
  },
];

export const DEFAULT_PLAN_LABEL = "GENERAL";

/** Slate 500 — what a label falls back to when its colour is missing or malformed. */
export const DEFAULT_LABEL_COLOUR = "#64748b";

/** Offered next to the colour input, so a sensible colour is one click away. */
export const PLAN_COLOUR_PRESETS = [
  "#f43f5e",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#64748b",
];

export function isHexColour(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function normaliseColour(value?: string | null): string {
  return value && isHexColour(value) ? value.toLowerCase() : DEFAULT_LABEL_COLOUR;
}

export function isBuiltInPlanLabel(id: string): boolean {
  return BUILT_IN_PLAN_LABELS.some((label) => label.id === id);
}

function customLook(label: { id: string; name: string; colour: string }): PlanLabelLook {
  return {
    id: label.id,
    name: label.name,
    badge: "plan-label-badge",
    dot: "plan-label-dot",
    accent: "plan-label-accent",
    style: { "--plan-label": normaliseColour(label.colour) } as CSSProperties,
  };
}

/** Every label the picker and the filters offer: the built-ins, then the user's own. */
export function planLabelLooks(
  custom: Array<{ id: string; name: string; colour: string }> = []
): PlanLabelLook[] {
  return [...BUILT_IN_PLAN_LABELS, ...custom.map(customLook)];
}

/** A plan whose label was deleted falls back to General rather than rendering blank. */
export function planLabelLook(id: string, looks: PlanLabelLook[]): PlanLabelLook {
  return (
    looks.find((look) => look.id === id) ??
    BUILT_IN_PLAN_LABELS.find((look) => look.id === DEFAULT_PLAN_LABEL)!
  );
}

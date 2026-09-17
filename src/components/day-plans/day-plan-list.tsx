"use client";

import { isSameDay, isToday, isTomorrow, isYesterday, startOfDay } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { planLabelLook } from "@/lib/plan-labels";
import { usePlanLabelLooks } from "@/hooks/use-plan-labels";
import { formatDate, formatDay } from "@/utils/format";
import { CustomFieldValueList } from "@/components/custom-fields/custom-field-values";
import type { DayPlanWithEmployment } from "@/types";

interface DayPlanListProps {
  plans: DayPlanWithEmployment[];
  onEdit: (plan: DayPlanWithEmployment) => void;
  onDelete: (plan: DayPlanWithEmployment) => void;
  onToggle: (plan: DayPlanWithEmployment, isDone: boolean) => void;
}

// Ticked off first of all, so a day whose to-dos are all done stops sitting in
// Upcoming as if there were still something to do. What is left runs today,
// overdue, then ahead — every one of them oldest to newest, so the whole open
// list reads in a single direction.
const SECTION_TODAY = 0;
const SECTION_OVERDUE = 1;
const SECTION_UPCOMING = 2;
const SECTION_DONE = 3;

// Today needs no heading — its group already carries a "Today" badge, and it is always first.
const SECTION_HEADINGS: Record<number, string | undefined> = {
  [SECTION_OVERDUE]: "Overdue",
  [SECTION_UPCOMING]: "Upcoming",
  [SECTION_DONE]: "Done",
};

function sectionFor(plan: DayPlanWithEmployment, today: Date): number {
  if (plan.isDone) return SECTION_DONE;
  const day = startOfDay(new Date(plan.date));
  if (isSameDay(day, today)) return SECTION_TODAY;
  return day > today ? SECTION_UPCOMING : SECTION_OVERDUE;
}

interface DayGroup {
  /** Unique per rendered group: one date can head both an open group and a done one. */
  key: string;
  /** The date alone, which is what the ordering compares. */
  dateKey: string;
  date: Date;
  section: number;
  plans: DayPlanWithEmployment[];
}

function groupByDate(plans: DayPlanWithEmployment[]): DayGroup[] {
  const today = startOfDay(new Date());
  const groups = new Map<string, DayGroup>();

  for (const plan of plans) {
    const date = new Date(plan.date);
    const section = sectionFor(plan, today);
    // One date can head two groups now — an open one and a done one — so the
    // section is part of what identifies a group.
    const dateKey = date.toISOString().slice(0, 10);
    const key = `${section}:${dateKey}`;
    const existing = groups.get(key);
    if (existing) {
      existing.plans.push(plan);
      continue;
    }
    groups.set(key, { key, dateKey, date, section, plans: [plan] });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.section !== b.section) return a.section - b.section;
    // Done is a record of what happened, so it reads newest first; everything
    // still to do counts forward from the oldest.
    return a.section === SECTION_DONE
      ? b.dateKey.localeCompare(a.dateKey)
      : a.dateKey.localeCompare(b.dateKey);
  });
}

function relativeDayLabel(date: Date): string | undefined {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return undefined;
}

export function DayPlanList({ plans, onEdit, onDelete, onToggle }: DayPlanListProps) {
  const labelLooks = usePlanLabelLooks();
  const groups = groupByDate(plans);

  return (
    <div className="space-y-5">
      {groups.map((group, index) => {
        const doneCount = group.plans.filter((p) => p.isDone).length;
        const relative = relativeDayLabel(group.date);
        // Only label a section once, where it starts.
        const sectionHeading =
          groups[index - 1]?.section === group.section ? undefined : SECTION_HEADINGS[group.section];

        return (
          <div key={group.key} className="space-y-2">
            {sectionHeading && (
              <p className="pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {sectionHeading}
              </p>
            )}
            <div className="flex items-center gap-2 border-b pb-1.5">
              <span className="text-sm font-semibold">{formatDate(group.date)}</span>
              <span className="text-xs text-muted-foreground">{formatDay(group.date)}</span>
              {relative && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {relative}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {doneCount}/{group.plans.length} done
              </span>
            </div>

            <ul className="space-y-1.5">
              {group.plans.map((plan) => {
                const look = planLabelLook(plan.label, labelLooks);

                return (
                  <li
                    key={plan.id}
                    style={look.style}
                    className={cn(
                      "flex items-start gap-3 rounded-md border border-l-4 p-2.5 transition-opacity",
                      look.accent,
                      plan.isDone && "opacity-60"
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={plan.isDone}
                      onCheckedChange={(checked) => onToggle(plan, checked as boolean)}
                      aria-label={plan.isDone ? "Mark as not done" : "Mark as done"}
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-sm font-medium", plan.isDone && "line-through")}>
                          {plan.title}
                        </span>
                        <Badge variant="secondary" className={look.badge} style={look.style}>
                          {look.name}
                        </Badge>
                        {plan.employment && (
                          <span className="text-xs text-muted-foreground">
                            {plan.employment.company.name}
                          </span>
                        )}
                      </div>
                      {plan.detail && (
                        <p className="text-xs whitespace-pre-wrap text-muted-foreground">{plan.detail}</p>
                      )}
                      <CustomFieldValueList entity="DAY_PLAN" values={plan.customValues} />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(plan)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(plan)}>
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

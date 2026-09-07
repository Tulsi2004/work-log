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
import { PLAN_LABEL_META, type PlanLabelValue } from "@/lib/plan-labels";
import { formatDate, formatDay } from "@/utils/format";
import { CustomFieldValueList } from "@/components/custom-fields/custom-field-values";
import type { DayPlanWithEmployment } from "@/types";

interface DayPlanListProps {
  plans: DayPlanWithEmployment[];
  onEdit: (plan: DayPlanWithEmployment) => void;
  onDelete: (plan: DayPlanWithEmployment) => void;
  onToggle: (plan: DayPlanWithEmployment, isDone: boolean) => void;
}

// Today first, then the days ahead (soonest first), then the days behind
// (most recent first) — so a plan made for the 10th rises to the top on the 10th.
const SECTION_TODAY = 0;
const SECTION_UPCOMING = 1;
const SECTION_EARLIER = 2;

// Today needs no heading — its group already carries a "Today" badge, and it is always first.
const SECTION_HEADINGS: Record<number, string | undefined> = {
  [SECTION_UPCOMING]: "Upcoming",
  [SECTION_EARLIER]: "Earlier",
};

interface DayGroup {
  key: string;
  date: Date;
  section: number;
  plans: DayPlanWithEmployment[];
}

function groupByDate(plans: DayPlanWithEmployment[]): DayGroup[] {
  const today = startOfDay(new Date());
  const groups = new Map<string, DayGroup>();

  for (const plan of plans) {
    const date = new Date(plan.date);
    const key = date.toISOString().slice(0, 10);
    const existing = groups.get(key);
    if (existing) {
      existing.plans.push(plan);
      continue;
    }
    const day = startOfDay(date);
    const section = isSameDay(day, today)
      ? SECTION_TODAY
      : day > today
        ? SECTION_UPCOMING
        : SECTION_EARLIER;
    groups.set(key, { key, date, section, plans: [plan] });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.section !== b.section) return a.section - b.section;
    // Upcoming counts up towards today; earlier counts back away from it.
    return a.section === SECTION_UPCOMING ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
  });
}

function relativeDayLabel(date: Date): string | undefined {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return undefined;
}

export function DayPlanList({ plans, onEdit, onDelete, onToggle }: DayPlanListProps) {
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
                const meta = PLAN_LABEL_META[plan.label as PlanLabelValue] ?? PLAN_LABEL_META.GENERAL;

                return (
                  <li
                    key={plan.id}
                    className={cn(
                      "flex items-start gap-3 rounded-md border border-l-4 p-2.5 transition-opacity",
                      meta.accent,
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
                        <Badge variant="secondary" className={meta.badge}>
                          {meta.name}
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

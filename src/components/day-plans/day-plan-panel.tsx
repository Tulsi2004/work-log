"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DayPlanList } from "@/components/day-plans/day-plan-list";
import { DayPlanFormDialog } from "@/components/day-plans/day-plan-form-dialog";
import { CustomFieldFilters } from "@/components/custom-fields/custom-field-filters";
import { useDayPlans, type DayPlanFilters } from "@/hooks/use-day-plans";
import { useEmployments } from "@/hooks/use-employments";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { deleteDayPlan, deleteDayPlans, setDayPlanDone } from "@/actions/day-plan-actions";
import { cn } from "@/lib/utils";
import { PLAN_LABELS, PLAN_LABEL_META } from "@/lib/plan-labels";
import { employmentLabel } from "@/utils/format";
import type { DayPlanWithEmployment } from "@/types";

const ALL = "ALL";

type StatusFilter = "ALL" | "open" | "done";

export function DayPlanPanel() {
  const queryClient = useQueryClient();
  const { data: employments } = useEmployments();

  const [search, setSearch] = useState("");
  const [label, setLabel] = useState<string>(ALL);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [employmentId, setEmploymentId] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const debouncedSearch = useDebouncedValue(search);
  const debouncedCustomFilters = useDebouncedValue(customFilters);

  const hasActiveFilters =
    !!search ||
    label !== ALL ||
    status !== "ALL" ||
    employmentId !== ALL ||
    !!dateFrom ||
    !!dateTo ||
    Object.values(customFilters).some(Boolean);

  const clearFilters = () => {
    setSearch("");
    setLabel(ALL);
    setStatus("ALL");
    setEmploymentId(ALL);
    setDateFrom("");
    setDateTo("");
    setCustomFilters({});
  };

  const filters: DayPlanFilters = {
    search: debouncedSearch,
    label: label === ALL ? undefined : label,
    employmentId: employmentId === ALL ? undefined : employmentId,
    status: status === "ALL" ? undefined : status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    customFilters: debouncedCustomFilters,
  };
  const { data, isLoading } = useDayPlans(filters);
  const plans = data?.data ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DayPlanWithEmployment | undefined>(undefined);
  const [deletingPlan, setDeletingPlan] = useState<DayPlanWithEmployment | undefined>(undefined);

  const openForm = (plan?: DayPlanWithEmployment) => {
    setEditingPlan(plan);
    setFormOpen(true);
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) => setDayPlanDone(id, isDone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["day-plans"] }),
    onError: (error: Error) => toast.error(error.message || "Failed to update to-do"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDayPlan(id),
    onSuccess: () => {
      toast.success("To-do deleted");
      queryClient.invalidateQueries({ queryKey: ["day-plans"] });
      setDeletingPlan(undefined);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete to-do"),
  });

  const donePlanIds = plans.filter((plan) => plan.isDone).map((plan) => plan.id);
  const [confirmClearDone, setConfirmClearDone] = useState(false);
  const clearDoneMutation = useMutation({
    mutationFn: (ids: string[]) => deleteDayPlans(ids),
    onSuccess: ({ count }) => {
      toast.success(count === 1 ? "1 to-do cleared" : `${count} to-dos cleared`);
      queryClient.invalidateQueries({ queryKey: ["day-plans"] });
      setConfirmClearDone(false);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to clear to-dos"),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search to-dos…"
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={employmentId} onValueChange={setEmploymentId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All companies</SelectItem>
                {employments?.map((employment) => (
                  <SelectItem key={employment.id} value={employment.id}>
                    {employmentLabel(employment)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <DatePicker value={dateFrom} onChange={setDateFrom} className="w-full sm:w-36" placeholder="From" />
              <span className="text-sm text-muted-foreground">–</span>
              <DatePicker value={dateTo} onChange={setDateTo} className="w-full sm:w-36" placeholder="To" />
            </div>
            <CustomFieldFilters entity="DAY_PLAN" values={customFilters} onChange={setCustomFilters} />
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-4" />
                Clear filters
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {donePlanIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={clearDoneMutation.isPending}
                onClick={() => setConfirmClearDone(true)}
              >
                <Trash2 className="size-4" />
                Clear done ({donePlanIds.length})
              </Button>
            )}
            <Button onClick={() => openForm()}>
              <Plus className="size-4" />
              Add to-do
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLabel(ALL)}
            aria-pressed={label === ALL}
            className={cn(
              "rounded-4xl border px-2.5 py-1 text-xs font-medium transition-colors",
              label === ALL
                ? "border-transparent bg-secondary text-secondary-foreground ring-2 ring-ring/50"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            All colours
          </button>
          {PLAN_LABELS.map((value) => {
            const meta = PLAN_LABEL_META[value];
            const selected = label === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setLabel(selected ? ALL : value)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-1.5 rounded-4xl border px-2.5 py-1 text-xs font-medium transition-colors",
                  selected
                    ? cn(meta.badge, "border-transparent ring-2 ring-ring/50")
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn("size-2.5 rounded-full", meta.dot)} />
                {meta.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No to-dos match the current filters."
                : "Nothing planned yet. Add what you need to do and give it a colour."}
            </p>
          ) : (
            <DayPlanList
              plans={plans}
              onEdit={(plan) => openForm(plan)}
              onDelete={(plan) => setDeletingPlan(plan)}
              onToggle={(plan, isDone) => toggleMutation.mutate({ id: plan.id, isDone })}
            />
          )}
        </div>
      </div>

      <DayPlanFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editingPlan}
        defaultEmploymentId={employmentId === ALL ? undefined : employmentId}
      />

      <ConfirmDialog
        open={confirmClearDone}
        onOpenChange={setConfirmClearDone}
        title={`Clear ${donePlanIds.length} done to-do${donePlanIds.length === 1 ? "" : "s"}?`}
        description="This permanently deletes every ticked-off to-do currently shown. Anything hidden by a filter is left alone."
        onConfirm={() => clearDoneMutation.mutate(donePlanIds)}
      />

      <ConfirmDialog
        open={!!deletingPlan}
        onOpenChange={(open) => !open && setDeletingPlan(undefined)}
        title="Delete to-do?"
        description={deletingPlan ? `This will permanently delete “${deletingPlan.title}”.` : undefined}
        onConfirm={() => deletingPlan && deleteMutation.mutate(deletingPlan.id)}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PLAN_LABELS, PLAN_LABEL_META } from "@/lib/plan-labels";
import { dayPlanSchema, type DayPlanInput } from "@/lib/validations/day-plan";
import { createDayPlan, updateDayPlan, deleteDayPlan } from "@/actions/day-plan-actions";
import { useEmployments } from "@/hooks/use-employments";
import { CustomFieldInputs } from "@/components/custom-fields/custom-field-inputs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { employmentLabel, formatDay } from "@/utils/format";
import type { DayPlanWithEmployment } from "@/types";

// Radix Select cannot hold an empty value, so "no company" needs a sentinel.
const NO_EMPLOYMENT = "NONE";

interface DayPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: DayPlanWithEmployment;
  defaultEmploymentId?: string;
}

function toDefaultValues(
  plan?: DayPlanWithEmployment,
  defaultEmploymentId?: string
): DayPlanInput {
  return {
    date: plan?.date
      ? new Date(plan.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    title: plan?.title ?? "",
    detail: plan?.detail ?? "",
    label: plan?.label ?? "GENERAL",
    employmentId: plan ? plan.employmentId ?? "" : defaultEmploymentId ?? "",
    isDone: plan?.isDone ?? false,
    // Blanks for fields the record has no value for are filled in by CustomFieldInputs.
    customValues: plan?.customValues ?? {},
  };
}

export function DayPlanFormDialog({
  open,
  onOpenChange,
  plan,
  defaultEmploymentId,
}: DayPlanFormDialogProps) {
  const isEditing = !!plan;
  const queryClient = useQueryClient();
  const { data: employments } = useEmployments();

  const form = useForm<DayPlanInput>({
    resolver: zodResolver(dayPlanSchema),
    defaultValues: toDefaultValues(plan, defaultEmploymentId),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(plan, defaultEmploymentId));
  }, [open, plan, defaultEmploymentId, form]);

  const dateValue = form.watch("date");

  const mutation = useMutation({
    mutationFn: async (values: DayPlanInput) => {
      if (isEditing) {
        await updateDayPlan(plan!.id, values);
      } else {
        await createDayPlan(values);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "To-do updated" : "To-do added");
      queryClient.invalidateQueries({ queryKey: ["day-plans"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => deleteDayPlan(plan!.id),
    onSuccess: () => {
      toast.success("To-do deleted");
      queryClient.invalidateQueries({ queryKey: ["day-plans"] });
      setConfirmDelete(false);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete to-do"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit to-do" : "Add to-do"}</DialogTitle>
          <DialogDescription>Something you need to do on a given day.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Day</FormLabel>
                <Input value={dateValue ? formatDay(dateValue) : ""} disabled readOnly />
              </FormItem>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What needs doing</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Add signup popup to landing page" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colour</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {PLAN_LABELS.map((value) => {
                      const meta = PLAN_LABEL_META[value];
                      const selected = field.value === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(value)}
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="detail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <Select
                    value={field.value || NO_EMPLOYMENT}
                    onValueChange={(value) => field.onChange(value === NO_EMPLOYMENT ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_EMPLOYMENT}>No company — personal</SelectItem>
                      {employments?.map((employment) => (
                        <SelectItem key={employment.id} value={employment.id}>
                          {employmentLabel(employment)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDone"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Already done</FormLabel>
                </FormItem>
              )}
            />

            <CustomFieldInputs entity="DAY_PLAN" />

            <DialogFooter className="sm:justify-between">
              {isEditing ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Add to-do"}
              </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete to-do?"
          description={plan ? `This will permanently delete “${plan.title}”.` : undefined}
          onConfirm={() => deleteMutation.mutate()}
        />
      </DialogContent>
    </Dialog>
  );
}

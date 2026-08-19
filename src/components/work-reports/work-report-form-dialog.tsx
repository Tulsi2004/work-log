"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AutocompleteInput } from "@/components/work-reports/autocomplete-input";
import { DAY_TYPES, workReportSchema, type WorkReportInput } from "@/lib/validations/work-report";
import { createWorkReport, updateWorkReport } from "@/actions/work-report-actions";
import { formatEnumLabel, formatDay } from "@/utils/format";
import type { EmploymentWithCompany, WorkReportWithEmployment, WorkReportTask } from "@/types";

interface WorkReportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employment: EmploymentWithCompany;
  report?: WorkReportWithEmployment;
}

function toDefaultValues(employment: EmploymentWithCompany, report?: WorkReportWithEmployment): WorkReportInput {
  const tasks = (report?.tasks as WorkReportTask[] | null) ?? [];
  const leaveFrom = report?.leaveFrom ? new Date(report.leaveFrom).toISOString().slice(0, 10) : "";
  const leaveTo = report?.leaveTo ? new Date(report.leaveTo).toISOString().slice(0, 10) : "";
  return {
    employmentId: report?.employmentId ?? employment.id,
    date: report?.date ? new Date(report.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    timeFrom: report?.timeFrom ?? employment.company.defaultTimeFrom ?? "",
    timeTo: report?.timeTo ?? employment.company.defaultTimeTo ?? "",
    dayType: report?.dayType ?? "OFFICE",

    isLeave: report?.isLeave ?? false,
    isLongVacation: !!(leaveFrom && leaveTo && leaveFrom !== leaveTo),
    leaveFrom,
    leaveTo,
    leaveReason: report?.leaveReason ?? "",

    hasMeeting: report?.hasMeeting ?? false,
    meetingWith: report?.meetingWith ?? "",
    meetingTopic: report?.meetingTopic ?? "",

    hasNoTask: report?.hasNoTask ?? false,
    noTaskNote: report?.noTaskNote ?? "",
    tasks: tasks.length
      ? tasks.map((t) => ({ task: t.task, projectName: t.projectName ?? "", assignedBy: t.assignedBy ?? "" }))
      : [{ task: "", projectName: "", assignedBy: "" }],

    notes: report?.notes ?? "",
  };
}

export function WorkReportFormDialog({ open, onOpenChange, employment, report }: WorkReportFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!report;

  const form = useForm<WorkReportInput>({
    resolver: zodResolver(workReportSchema),
    defaultValues: toDefaultValues(employment, report),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(employment, report));
  }, [open, employment, report, form]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "tasks" });

  const dateValue = form.watch("date");
  const isLeave = form.watch("isLeave");
  const isLongVacation = form.watch("isLongVacation");
  const hasNoTask = form.watch("hasNoTask");
  const hasMeeting = form.watch("hasMeeting");

  useEffect(() => {
    if (isLeave && !isLongVacation) {
      form.setValue("leaveFrom", dateValue);
      form.setValue("leaveTo", dateValue);
    }
  }, [isLeave, isLongVacation, dateValue, form]);

  const { data: projectSuggestions = [], isLoading: isLoadingProjectSuggestions } = useQuery({
    queryKey: ["work-reports-suggestions", "projectName"],
    queryFn: async () => {
      const res = await fetch("/api/work-reports/suggestions?type=projectName");
      if (!res.ok) throw new Error("Failed to load suggestions");
      return (await res.json()).data as string[];
    },
    enabled: open,
  });

  const { data: assignedBySuggestions = [], isLoading: isLoadingAssignedBySuggestions } = useQuery({
    queryKey: ["work-reports-suggestions", "assignedBy"],
    queryFn: async () => {
      const res = await fetch("/api/work-reports/suggestions?type=assignedBy");
      if (!res.ok) throw new Error("Failed to load suggestions");
      return (await res.json()).data as string[];
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (values: WorkReportInput) =>
      isEditing ? updateWorkReport(report!.id, values) : createWorkReport(values),
    onSuccess: () => {
      toast.success(isEditing ? "Work report updated" : "Work report added");
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit work report" : "Add work report"}</DialogTitle>
          <DialogDescription>Log what you worked on today.</DialogDescription>
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="timeFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time worked — from</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isLeave && (
              <FormField
                control={form.control}
                name="dayType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Working from</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-x-4 gap-y-2">
                        {DAY_TYPES.map((type) => (
                          <div key={type} className="flex items-center gap-2">
                            <RadioGroupItem value={type} id={`day-type-${type}`} />
                            <Label htmlFor={`day-type-${type}`} className="font-normal">
                              {formatEnumLabel(type)}
                              {type === "OFFICE" && <span className="text-muted-foreground"> (default)</span>}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-3 rounded-lg border p-3">
              <FormField
                control={form.control}
                name="isLeave"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">On leave</FormLabel>
                  </FormItem>
                )}
              />

              {isLeave && (
                <div className="space-y-3 pl-6">
                  <FormField
                    control={form.control}
                    name="isLongVacation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Long vacation (multiple days)</FormLabel>
                      </FormItem>
                    )}
                  />

                  {isLongVacation && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="leaveFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leave from</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value}
                                onChange={(value) => {
                                  field.onChange(value);
                                  if (!form.getValues("leaveTo")) form.setValue("leaveTo", value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="leaveTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To</FormLabel>
                            <FormControl>
                              <DatePicker value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="leaveReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Reason for leave" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <FormField
                control={form.control}
                name="hasMeeting"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Meeting scheduled</FormLabel>
                  </FormItem>
                )}
              />

              {hasMeeting && (
                <div className="space-y-3 pl-6">
                  <FormField
                    control={form.control}
                    name="meetingWith"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Who all</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Manager, client name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="meetingTopic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic</FormLabel>
                        <FormControl>
                          <Input placeholder="What the meeting is about" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {!isLeave && (
            <div className="space-y-3 rounded-lg border p-3">
              <FormField
                control={form.control}
                name="hasNoTask"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">No task today</FormLabel>
                  </FormItem>
                )}
              />

              {hasNoTask ? (
                <FormField
                  control={form.control}
                  name="noTaskNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Input placeholder="Why there's no task today" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <FormLabel>Tasks</FormLabel>
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <span className="mt-2 w-5 shrink-0 text-sm text-muted-foreground">{index + 1}.</span>
                      <div className="flex flex-1 flex-col gap-2">
                        <FormField
                          control={form.control}
                          name={`tasks.${index}.task`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Task" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.projectName`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <AutocompleteInput
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    placeholder="Project name"
                                    suggestions={projectSuggestions}
                                    isLoadingSuggestions={isLoadingProjectSuggestions}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.assignedBy`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <AutocompleteInput
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    placeholder="Assigned by"
                                    suggestions={assignedBySuggestions}
                                    isLoadingSuggestions={isLoadingAssignedBySuggestions}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-0.5"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Remove task</span>
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ task: "", projectName: "", assignedBy: "" })}
                  >
                    <Plus className="size-4" />
                    Add task
                  </Button>
                  {form.formState.errors.tasks?.message && (
                    <p className="text-sm text-destructive">{form.formState.errors.tasks.message}</p>
                  )}
                </div>
              )}
            </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details to note</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Anything else worth noting…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {isEditing ? "Save changes" : "Save work report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

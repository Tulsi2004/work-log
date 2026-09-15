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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AutocompleteInput } from "@/components/work-reports/autocomplete-input";
import { CustomFieldInputs } from "@/components/custom-fields/custom-field-inputs";
import { SpendListFields } from "@/components/money/spend-list-fields";
import { salaryEntrySchema, type SalaryEntryInput } from "@/lib/validations/salary-entry";
import {
  createSalaryEntry,
  updateSalaryEntry,
  deleteSalaryEntry,
} from "@/actions/salary-entry-actions";
import { useEmployments } from "@/hooks/use-employments";
import { useSuggestions } from "@/hooks/use-suggestions";
import { employmentLabel, formatDate, formatDay, formatMoney } from "@/utils/format";
import {
  lastPayDate,
  payRateOn,
  type EmploymentListItem,
  type SalaryEntryWithEmployment,
} from "@/types";

// Radix Select cannot hold an empty value, so "no company" needs a sentinel.
const NO_EMPLOYMENT = "NONE";

const today = () => new Date().toISOString().slice(0, 10);

// What a company's pay history says was in hand on the day the money arrived —
// the starting point for the amount, since that is what usually lands.
function suggestedAmountFor(
  employments: EmploymentListItem[] | undefined,
  employmentId: string,
  day: string
): string {
  const employment = employments?.find((e) => e.id === employmentId);
  const rate = employment ? payRateOn(employment.payHistory, day) : undefined;
  return rate ? String(rate.inHandSalary) : "";
}

// A company that always pays on the same day of the month knows the date
// already — the last one that has come round.
function suggestedDateFor(
  employments: EmploymentListItem[] | undefined,
  employmentId: string
): string {
  const employment = employments?.find((e) => e.id === employmentId);
  return lastPayDate(employment?.payDay) ?? "";
}

interface MoneyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: SalaryEntryWithEmployment;
  defaultEmploymentId?: string;
}

function toDefaultValues(
  entry?: SalaryEntryWithEmployment,
  defaultEmploymentId?: string
): SalaryEntryInput {
  return {
    date: entry?.date
      ? new Date(entry.date).toISOString().slice(0, 10)
      : today(),
    amount: entry ? String(entry.amount) : "",
    source: entry?.source ?? "",
    employmentId: entry ? entry.employmentId ?? "" : defaultEmploymentId ?? "",
    note: entry?.note ?? "",
    spends: (entry?.spends ?? []).map((spend) => ({
      what: spend.what,
      amount: String(spend.amount),
      category: spend.category,
    })),
    // Blanks for fields the record has no value for are filled in by CustomFieldInputs.
    customValues: entry?.customValues ?? {},
  };
}

export function MoneyFormDialog({
  open,
  onOpenChange,
  entry,
  defaultEmploymentId,
}: MoneyFormDialogProps) {
  const isEditing = !!entry;
  const queryClient = useQueryClient();
  const { data: employments } = useEmployments();

  const form = useForm<SalaryEntryInput>({
    resolver: zodResolver(salaryEntrySchema),
    defaultValues: toDefaultValues(entry, defaultEmploymentId),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(entry, defaultEmploymentId));
  }, [open, entry, defaultEmploymentId, form]);

  const dateValue = form.watch("date");
  const amountValue = form.watch("amount");
  const employmentIdValue = form.watch("employmentId");
  // Offered, never forced: the box keeps whatever is typed in it, and this only
  // shows while it differs from what the company's pay history would suggest.
  const suggestedAmount = suggestedAmountFor(employments, employmentIdValue ?? "", dateValue);
  const suggestedDate = suggestedDateFor(employments, employmentIdValue ?? "");

  // Sources you have used before — "Monthly salary", "Bonus", "Freelance".
  const { data: sourceSuggestions = [], isLoading: isLoadingSources } = useSuggestions(
    "/api/salary-entries/suggestions?type=source",
    open
  );

  const mutation = useMutation({
    mutationFn: async (values: SalaryEntryInput) => {
      if (isEditing) {
        await updateSalaryEntry(entry!.id, values);
      } else {
        await createSalaryEntry(values);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Money entry updated" : "Money entry added");
      queryClient.invalidateQueries({ queryKey: ["salary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // A source or a spend typed here is a suggestion for the next entry.
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => deleteSalaryEntry(entry!.id),
    onSuccess: () => {
      toast.success("Money entry deleted");
      queryClient.invalidateQueries({ queryKey: ["salary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setConfirmDelete(false);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete money entry"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit money entry" : "Add money entry"}</DialogTitle>
          <DialogDescription>Money you received on a day, and what you did with it.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received on</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    {suggestedDate && suggestedDate !== field.value && (
                      <FormDescription>
                        <button
                          type="button"
                          onClick={() => form.setValue("date", suggestedDate, { shouldDirty: true })}
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          Pay day — use {formatDate(suggestedDate)}
                        </button>
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Day</FormLabel>
                <Input value={dateValue ? formatDay(dateValue) : ""} disabled readOnly />
              </FormItem>
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="45000" {...field} />
                    </FormControl>
                    {suggestedAmount && suggestedAmount !== amountValue && (
                      <FormDescription>
                        <button
                          type="button"
                          onClick={() =>
                            form.setValue("amount", suggestedAmount, { shouldDirty: true })
                          }
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          Use in-hand {formatMoney(Number(suggestedAmount))}
                        </button>
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="e.g. Monthly salary, bonus, freelance"
                        suggestions={sourceSuggestions}
                        isLoadingSuggestions={isLoadingSources}
                      />
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
                      onValueChange={(value) => {
                        const nextId = value === NO_EMPLOYMENT ? "" : value;
                        field.onChange(nextId);
                        if (isEditing) return;

                        // The date moves to the company's pay day, but only while
                        // it is still the untouched default — a date picked by
                        // hand is left alone.
                        const payDate = suggestedDateFor(employments, nextId);
                        const untouched =
                          form.getValues("date") === today() ||
                          form.getValues("date") === suggestedDateFor(employments, field.value ?? "");
                        if (payDate && untouched) {
                          form.setValue("date", payDate, { shouldDirty: true });
                        }

                        // Same rule for the amount: fill it from the pay history
                        // in force on that date, never over something typed.
                        if (form.getValues("amount")) return;
                        const suggested = suggestedAmountFor(
                          employments,
                          nextId,
                          form.getValues("date")
                        );
                        if (suggested) form.setValue("amount", suggested, { shouldDirty: true });
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_EMPLOYMENT}>No company — personal / other</SelectItem>
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
            </div>

            <SpendListFields />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Anything worth remembering about this money"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CustomFieldInputs entity="SALARY_ENTRY" />

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
                  {mutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Add entry"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete money entry?"
          description={
            entry
              ? `This will permanently delete the money received on ${formatDate(entry.date)}, and everything recorded against it.`
              : undefined
          }
          onConfirm={() => deleteMutation.mutate()}
        />
      </DialogContent>
    </Dialog>
  );
}

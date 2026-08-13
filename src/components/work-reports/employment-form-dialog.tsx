"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { employmentSchema, type EmploymentInput } from "@/lib/validations/work-report";
import { createEmployment, updateEmployment } from "@/actions/work-report-actions";
import { useEmployments } from "@/hooks/use-employments";
import type { EmploymentWithCompany, PayRate } from "@/types";

interface EmploymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employment?: EmploymentWithCompany;
  onSaved?: (employmentId: string) => void;
}

function toDefaultValues(employment?: EmploymentWithCompany): EmploymentInput {
  const payHistory = (employment?.payHistory as PayRate[] | null) ?? [];
  return {
    companyName: employment?.company.name ?? "",
    designation: employment?.designation ?? "",
    since: employment?.since ? new Date(employment.since).toISOString().slice(0, 10) : "",
    until: employment?.until ? new Date(employment.until).toISOString().slice(0, 10) : "",
    paymentType: employment?.paymentType ?? "MONTHLY",
    payHistory: payHistory.length
      ? payHistory.map((p) => ({ amount: String(p.amount), effectiveFrom: p.effectiveFrom }))
      : [{ amount: "", effectiveFrom: new Date().toISOString().slice(0, 10) }],
  };
}

export function EmploymentFormDialog({ open, onOpenChange, employment, onSaved }: EmploymentFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: employments } = useEmployments();
  const isEditing = !!employment;
  const companyNames = [...new Set((employments ?? []).map((e) => e.company.name))];

  const form = useForm<EmploymentInput>({
    resolver: zodResolver(employmentSchema),
    defaultValues: toDefaultValues(employment),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(employment));
  }, [open, employment, form]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "payHistory" });

  const mutation = useMutation({
    mutationFn: async (values: EmploymentInput) =>
      isEditing ? updateEmployment(employment!.id, values) : createEmployment(values),
    onSuccess: (result) => {
      toast.success(isEditing ? "Saved" : "Company added");
      queryClient.invalidateQueries({ queryKey: ["employments"] });
      onOpenChange(false);
      onSaved?.(result.id);
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit company" : "Add company"}</DialogTitle>
          <DialogDescription>Company, designation, and pay for this stint.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Trackly" list="company-names" {...field} />
                  </FormControl>
                  <datalist id="company-names">
                    {companyNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SEO Executive" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="since"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <Input type="date" placeholder="Present" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="LUMPSUM" id="payment-lumpsum" />
                        <Label htmlFor="payment-lumpsum" className="font-normal">Lump sum</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="MONTHLY" id="payment-monthly" />
                        <Label htmlFor="payment-monthly" className="font-normal">Monthly</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Pay history</FormLabel>
              {fields.map((item, index) => (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <FormField
                      control={form.control}
                      name={`payHistory.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Amount" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`payHistory.${index}.effectiveFrom`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    <span className="sr-only">Remove pay entry</span>
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ amount: "", effectiveFrom: new Date().toISOString().slice(0, 10) })}
              >
                <Plus className="size-4" />
                Add a hike
              </Button>
              {form.formState.errors.payHistory?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.payHistory.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {isEditing ? "Save changes" : "Add company"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

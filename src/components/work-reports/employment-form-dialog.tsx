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
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { employmentSchema, EMPLOYMENT_TYPES, type EmploymentInput } from "@/lib/validations/work-report";
import { formatEnumLabel } from "@/utils/format";
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
    ceoName: employment?.company.ceoName ?? "",
    jobSource: employment?.company.jobSource ?? "",
    defaultTimeFrom: employment?.company.defaultTimeFrom ?? "",
    defaultTimeTo: employment?.company.defaultTimeTo ?? "",
    designation: employment?.designation ?? "",
    employmentType: employment?.employmentType ?? "FULL_TIME",
    since: employment?.since ? new Date(employment.since).toISOString().slice(0, 10) : "",
    until: employment?.until ? new Date(employment.until).toISOString().slice(0, 10) : "",
    paymentType: employment?.paymentType ?? "MONTHLY",
    payHistory: payHistory.length
      ? payHistory.map((p) => ({
          actualSalary: String(p.actualSalary),
          pf: p.pf ? String(p.pf) : "",
          inHandSalary: String(p.inHandSalary),
          effectiveFrom: p.effectiveFrom,
        }))
      : [{ actualSalary: "", pf: "", inHandSalary: "", effectiveFrom: new Date().toISOString().slice(0, 10) }],
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

  const untilValue = form.watch("until");
  const isCurrent = !untilValue;

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
              name="ceoName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEO name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="jobSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source of job</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. LinkedIn, referral, Naukri" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="defaultTimeFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default shift start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultTimeTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default shift end</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <FormField
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment type</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-x-4 gap-y-2">
                      {EMPLOYMENT_TYPES.map((type) => (
                        <div key={type} className="flex items-center gap-2">
                          <RadioGroupItem value={type} id={`employment-type-${type}`} />
                          <Label htmlFor={`employment-type-${type}`} className="font-normal">
                            {formatEnumLabel(type)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="currently-working"
                checked={isCurrent}
                onCheckedChange={(checked) => {
                  form.setValue("until", checked === true ? "" : new Date().toISOString().slice(0, 10));
                }}
              />
              <Label htmlFor="currently-working" className="font-normal">
                Currently working here
              </Label>
            </div>
            <div className={cn("grid gap-3", isCurrent ? "grid-cols-1" : "grid-cols-2")}>
              <FormField
                control={form.control}
                name="since"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} placeholder="Start date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isCurrent && (
                <FormField
                  control={form.control}
                  name="until"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} placeholder="End date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
                <div key={item.id} className="flex items-start gap-2 rounded-md border p-2">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`payHistory.${index}.actualSalary`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Actual salary" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`payHistory.${index}.pf`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="PF" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`payHistory.${index}.inHandSalary`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="In-hand salary" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`payHistory.${index}.effectiveFrom`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <DatePicker value={field.value} onChange={field.onChange} placeholder="Effective from" />
                            </FormControl>
                            <FormMessage />
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
                    <span className="sr-only">Remove pay entry</span>
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ actualSalary: "", pf: "", inHandSalary: "", effectiveFrom: new Date().toISOString().slice(0, 10) })
                }
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

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEnumLabel, formatTenure, formatTime } from "@/utils/format";
import { CustomFieldValueList } from "@/components/custom-fields/custom-field-values";
import type { EmploymentListItem, PayRate } from "@/types";

interface EmploymentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employment: EmploymentListItem;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export function EmploymentViewDialog({ open, onOpenChange, employment }: EmploymentViewDialogProps) {
  const payHistory = (employment.payHistory as PayRate[] | null) ?? [];
  const sorted = [...payHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const shiftFrom = formatTime(employment.company.defaultTimeFrom);
  const shiftTo = formatTime(employment.company.defaultTimeTo);
  const tenure = formatTenure(employment.since, employment.until);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{employment.company.name}</DialogTitle>
          <DialogDescription>
            {employment.designation || "Company details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="CEO" value={employment.company.ceoName} />
            <Field label="Job source" value={employment.company.jobSource} />
            <Field label="Employment type" value={formatEnumLabel(employment.employmentType)} />
            <Field label="Payment type" value={formatEnumLabel(employment.paymentType)} />
            <Field
              label="Default shift"
              value={shiftFrom || shiftTo ? `${shiftFrom || "—"} to ${shiftTo || "—"}` : undefined}
            />
            <Field
              label="Period"
              value={
                employment.since || employment.until
                  ? `${employment.since ? formatDate(employment.since) : "—"} – ${employment.until ? formatDate(employment.until) : "Present"}`
                  : undefined
              }
            />
            <Field label="Total experience" value={tenure} />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Pay history</p>
            {sorted.length ? (
              <div className="space-y-2">
                {sorted.map((p) => (
                  <div
                    key={p.effectiveFrom}
                    className="flex flex-wrap items-center gap-2 rounded-lg border p-2"
                  >
                    <Badge variant="secondary">From {formatDate(p.effectiveFrom)}</Badge>
                    <Badge variant="secondary">₹{p.actualSalary} actual</Badge>
                    {p.pf > 0 && <Badge variant="secondary">₹{p.pf} PF</Badge>}
                    <Badge variant="secondary">₹{p.inHandSalary} in-hand</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium">—</p>
            )}
          </div>

          <CustomFieldValueList
            entity="EMPLOYMENT"
            values={employment.customValues}
            className="grid grid-cols-2 gap-4 text-sm"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

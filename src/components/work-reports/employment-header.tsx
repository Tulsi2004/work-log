"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmploymentFormDialog } from "@/components/work-reports/employment-form-dialog";
import { useEmployments } from "@/hooks/use-employments";
import { formatDate, formatEnumLabel } from "@/utils/format";
import { currentPayRate } from "@/types";
import type { EmploymentWithCompany } from "@/types";

interface EmploymentHeaderProps {
  employmentId: string;
  onEmploymentChange: (employmentId: string) => void;
}

function employmentLabel(e: EmploymentWithCompany) {
  return e.designation ? `${e.company.name} — ${e.designation}` : e.company.name;
}

export function EmploymentHeader({ employmentId, onEmploymentChange }: EmploymentHeaderProps) {
  const { data: employments, isLoading } = useEmployments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<EmploymentWithCompany | undefined>(undefined);

  const selected = employments?.find((e) => e.id === employmentId);
  const pay = selected ? currentPayRate(selected.payHistory) : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold">Work Report</h1>
        <div className="mt-2 flex items-center gap-2">
          <Select
            value={employmentId || undefined}
            onValueChange={onEmploymentChange}
            disabled={isLoading || !employments?.length}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder={isLoading ? "Loading…" : "Select company"} />
            </SelectTrigger>
            <SelectContent>
              {employments?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {employmentLabel(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setEditingEmployment(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            <span className="sr-only">Add company</span>
          </Button>
        </div>
      </div>

      {selected && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{formatEnumLabel(selected.paymentType)}</Badge>
          {pay && <Badge variant="secondary">₹{pay.amount}</Badge>}
          {(selected.since || selected.until) && (
            <Badge variant="secondary">
              {selected.since ? formatDate(selected.since) : "—"} – {selected.until ? formatDate(selected.until) : "Present"}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setEditingEmployment(selected);
              setDialogOpen(true);
            }}
          >
            <Pencil className="size-4" />
            <span className="sr-only">Edit company</span>
          </Button>
        </div>
      )}

      <EmploymentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employment={editingEmployment}
        onSaved={(id) => onEmploymentChange(id)}
      />
    </div>
  );
}

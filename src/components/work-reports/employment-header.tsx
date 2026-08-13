"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { deleteEmployment } from "@/actions/work-report-actions";
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
  const queryClient = useQueryClient();

  const selected = employments?.find((e) => e.id === employmentId);
  const pay = selected ? currentPayRate(selected.payHistory) : undefined;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployment(id),
    onSuccess: () => {
      toast.success("Company removed");
      queryClient.invalidateQueries({ queryKey: ["employments"] });
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onEmploymentChange("");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove company"),
  });

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
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (
                confirm(
                  `Remove ${selected.company.name}${selected.designation ? ` — ${selected.designation}` : ""}? This will also delete all of its work reports.`
                )
              ) {
                deleteMutation.mutate(selected.id);
              }
            }}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Remove company</span>
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

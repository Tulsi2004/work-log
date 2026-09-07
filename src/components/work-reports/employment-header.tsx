"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
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
import { EmploymentViewDialog } from "@/components/work-reports/employment-view-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useEmployments } from "@/hooks/use-employments";
import { deleteEmployment } from "@/actions/work-report-actions";
import { formatDate, formatEnumLabel, formatTenure, employmentLabel } from "@/utils/format";
import { currentPayRate } from "@/types";
import type { EmploymentListItem } from "@/types";

interface EmploymentHeaderProps {
  employmentId: string;
  onEmploymentChange: (employmentId: string) => void;
}

export function EmploymentHeader({ employmentId, onEmploymentChange }: EmploymentHeaderProps) {
  const { data: employments, isLoading } = useEmployments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<EmploymentListItem | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const selected = employments?.find((e) => e.id === employmentId);
  const pay = selected ? currentPayRate(selected.payHistory) : undefined;
  const tenure = selected ? formatTenure(selected.since, selected.until) : undefined;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployment(id),
    onSuccess: () => {
      toast.success("Company removed");
      queryClient.invalidateQueries({ queryKey: ["employments"] });
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onEmploymentChange("");
      setDeleteDialogOpen(false);
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
            <SelectTrigger className="min-w-0 flex-1 sm:w-64 sm:flex-none">
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
            className="shrink-0"
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{formatEnumLabel(selected.employmentType)}</Badge>
          <Badge variant="secondary">{formatEnumLabel(selected.paymentType)}</Badge>
          {pay && <Badge variant="secondary">₹{pay.actualSalary} actual</Badge>}
          {pay && pay.pf > 0 && <Badge variant="secondary">₹{pay.pf} PF</Badge>}
          {pay && <Badge variant="secondary">₹{pay.inHandSalary} in-hand</Badge>}
          {(selected.since || selected.until) && (
            <Badge variant="secondary">
              {selected.since ? formatDate(selected.since) : "—"} – {selected.until ? formatDate(selected.until) : "Present"}
            </Badge>
          )}
          {tenure && <Badge variant="secondary">{tenure} total</Badge>}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setViewDialogOpen(true)}
          >
            <Eye className="size-4" />
            <span className="sr-only">View company</span>
          </Button>
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
            onClick={() => setDeleteDialogOpen(true)}
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
        onDeleted={() => onEmploymentChange("")}
      />

      {selected && (
        <EmploymentViewDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          employment={selected}
        />
      )}

      {selected && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Remove company?"
          description={`This will permanently remove ${selected.company.name}${selected.designation ? ` — ${selected.designation}` : ""} and all of its work reports.`}
          onConfirm={() => deleteMutation.mutate(selected.id)}
        />
      )}
    </div>
  );
}

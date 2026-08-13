"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmploymentHeader } from "@/components/work-reports/employment-header";
import { WorkReportCard } from "@/components/work-reports/work-report-card";
import { WorkReportFormDialog } from "@/components/work-reports/work-report-form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWorkReports } from "@/hooks/use-work-reports";
import { useEmployments } from "@/hooks/use-employments";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { deleteWorkReport } from "@/actions/work-report-actions";
import { DAY_TYPES } from "@/lib/validations/work-report";
import { formatEnumLabel } from "@/utils/format";
import type { WorkReportWithEmployment } from "@/types";

const ALL_DAY_TYPES = "ALL";

export function WorkReportPanel() {
  const { data: employments } = useEmployments();
  const [selectedEmploymentId, setSelectedEmploymentId] = useState("");
  const employmentId = selectedEmploymentId || employments?.[0]?.id || "";
  const [search, setSearch] = useState("");
  const [dayType, setDayType] = useState(ALL_DAY_TYPES);
  const debouncedSearch = useDebouncedValue(search);

  const queryClient = useQueryClient();
  const { data, isLoading } = useWorkReports({
    search: debouncedSearch,
    employmentId,
    dayType: dayType === ALL_DAY_TYPES ? undefined : dayType,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WorkReportWithEmployment | undefined>(undefined);
  const [deletingReport, setDeletingReport] = useState<WorkReportWithEmployment | undefined>(undefined);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkReport(id),
    onSuccess: () => {
      toast.success("Work report deleted");
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeletingReport(undefined);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete work report"),
  });

  const reports = data?.data ?? [];

  return (
    <div className="space-y-4">
      <EmploymentHeader employmentId={employmentId} onEmploymentChange={setSelectedEmploymentId} />

      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search work reports…"
                className="pl-8"
              />
            </div>
            <Select value={dayType} onValueChange={setDayType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DAY_TYPES}>All types</SelectItem>
                {DAY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEnumLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!employmentId}
            onClick={() => {
              setEditingReport(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add work report
          </Button>
        </div>

        <div className="mt-4">
          {!employmentId ? (
            <p className="text-sm text-muted-foreground">Add a company above to start logging work reports.</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No work reports yet. Add your first one instead of reaching for Word or Excel.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <WorkReportCard
                  key={report.id}
                  report={report}
                  onEdit={(r) => {
                    setEditingReport(r);
                    setFormOpen(true);
                  }}
                  onDelete={(r) => setDeletingReport(r)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {employmentId && (
        <WorkReportFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          employmentId={employmentId}
          report={editingReport}
        />
      )}

      <ConfirmDialog
        open={!!deletingReport}
        onOpenChange={(open) => !open && setDeletingReport(undefined)}
        title="Delete work report?"
        description={
          deletingReport
            ? `This will permanently delete the work report for ${new Date(deletingReport.date).toLocaleDateString()}.`
            : undefined
        }
        onConfirm={() => deletingReport && deleteMutation.mutate(deletingReport.id)}
      />
    </div>
  );
}

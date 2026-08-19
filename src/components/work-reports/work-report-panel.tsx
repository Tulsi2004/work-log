"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDay } from "date-fns";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmploymentHeader } from "@/components/work-reports/employment-header";
import { WorkReportTable } from "@/components/work-reports/work-report-table";
import { WorkReportFormDialog } from "@/components/work-reports/work-report-form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AutocompleteInput } from "@/components/work-reports/autocomplete-input";
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterByLeave, setFilterByLeave] = useState(false);
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [assignedBy, setAssignedBy] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const debouncedProjectName = useDebouncedValue(projectName);
  const debouncedAssignedBy = useDebouncedValue(assignedBy);

  // Fetch suggestions for project names and assigned by
  const { data: projectSuggestions = [], isLoading: isLoadingProjectSuggestions } = useQuery({
    queryKey: ["work-reports-suggestions", "projectName"],
    queryFn: async () => {
      const res = await fetch("/api/work-reports/suggestions?type=projectName");
      if (!res.ok) throw new Error("Failed to load suggestions");
      return (await res.json()).data as string[];
    },
  });

  const { data: assignedBySuggestions = [], isLoading: isLoadingAssignedBySuggestions } = useQuery({
    queryKey: ["work-reports-suggestions", "assignedBy"],
    queryFn: async () => {
      const res = await fetch("/api/work-reports/suggestions?type=assignedBy");
      if (!res.ok) throw new Error("Failed to load suggestions");
      return (await res.json()).data as string[];
    },
  });

  const hasActiveFilters = !!(search || dayType !== ALL_DAY_TYPES || dateFrom || dateTo || filterByLeave || weekendOnly || projectName || assignedBy);
  const clearFilters = () => {
    setSearch("");
    setDayType(ALL_DAY_TYPES);
    setDateFrom("");
    setDateTo("");
    setFilterByLeave(false);
    setWeekendOnly(false);
    setProjectName("");
    setAssignedBy("");
  };

  const queryClient = useQueryClient();
  const { data, isLoading } = useWorkReports({
    search: debouncedSearch,
    employmentId,
    dayType: dayType === ALL_DAY_TYPES ? undefined : dayType,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    isLeave: filterByLeave ? true : undefined,
    projectName: debouncedProjectName || undefined,
    assignedBy: debouncedAssignedBy || undefined,
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
  const visibleReports = weekendOnly
    ? reports.filter((r) => [0, 6].includes(getDay(new Date(r.date))))
    : reports;

  return (
    <div className="space-y-4">
      <EmploymentHeader employmentId={employmentId} onEmploymentChange={setSelectedEmploymentId} />

      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
              <SelectTrigger className="w-full sm:w-40">
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
            <div className="flex items-center gap-2">
              <DatePicker value={dateFrom} onChange={setDateFrom} className="w-full sm:w-36" placeholder="From" />
              <span className="text-sm text-muted-foreground">–</span>
              <DatePicker value={dateTo} onChange={setDateTo} className="w-full sm:w-36" placeholder="To" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-leave"
                checked={filterByLeave}
                onCheckedChange={(checked) => setFilterByLeave(checked as boolean)}
              />
              <label htmlFor="filter-leave" className="text-sm cursor-pointer whitespace-nowrap">
                Leave only
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-weekend"
                checked={weekendOnly}
                onCheckedChange={(checked) => setWeekendOnly(checked as boolean)}
              />
              <label htmlFor="filter-weekend" className="text-sm cursor-pointer whitespace-nowrap">
                Weekends only
              </label>
            </div>
            <div className="w-full sm:max-w-xs">
              <AutocompleteInput
                value={projectName}
                onChange={setProjectName}
                placeholder="Project name…"
                suggestions={projectSuggestions}
                isLoadingSuggestions={isLoadingProjectSuggestions}
              />
            </div>
            <div className="w-full sm:max-w-xs">
              <AutocompleteInput
                value={assignedBy}
                onChange={setAssignedBy}
                placeholder="Assigned by…"
                suggestions={assignedBySuggestions}
                isLoadingSuggestions={isLoadingAssignedBySuggestions}
              />
            </div>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-4" />
                Clear filters
              </Button>
            )}
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
          ) : visibleReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No work reports match the current filters.</p>
          ) : (
            <WorkReportTable
              reports={visibleReports}
              onEdit={(r) => {
                setEditingReport(r);
                setFormOpen(true);
              }}
              onDelete={(r) => setDeletingReport(r)}
            />
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

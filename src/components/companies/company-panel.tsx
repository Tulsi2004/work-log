"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRefresh } from "@/hooks/use-refresh";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CompanyTable } from "@/components/companies/company-table";
import { CompanySummary } from "@/components/companies/company-summary";
import { EmploymentFormDialog } from "@/components/work-reports/employment-form-dialog";
import { useEmployments } from "@/hooks/use-employments";
import { deleteEmployment } from "@/actions/work-report-actions";
import { EMPLOYMENT_TYPES } from "@/lib/validations/work-report";
import { formatEnumLabel } from "@/utils/format";
import type { EmploymentListItem } from "@/types";

const ALL = "ALL";

type StatusFilter = "ALL" | "current" | "past";

function isCurrent(employment: EmploymentListItem): boolean {
  return !employment.until || new Date(employment.until) >= new Date();
}

export function CompanyPanel() {
  const refresh = useRefresh();
  const { data: employments, isLoading } = useEmployments();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [employmentType, setEmploymentType] = useState(ALL);

  const hasActiveFilters = !!search || status !== "ALL" || employmentType !== ALL;

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setEmploymentType(ALL);
  };

  // A handful of rows at most, so the filtering happens here rather than as a request.
  const term = search.trim().toLowerCase();
  const matching = (employments ?? []).filter((employment) => {
    if (status === "current" && !isCurrent(employment)) return false;
    if (status === "past" && isCurrent(employment)) return false;
    if (employmentType !== ALL && employment.employmentType !== employmentType) return false;
    if (!term) return true;
    return [
      employment.company.name,
      employment.designation ?? "",
      employment.company.ceoName ?? "",
      employment.company.jobSource ?? "",
    ].some((value) => value.toLowerCase().includes(term));
  });

  // Where you work now leads, then the rest newest first. Sorting a column in
  // the table takes over from here.
  const visible = [...matching].sort((a, b) => {
    if (isCurrent(a) !== isCurrent(b)) return isCurrent(a) ? -1 : 1;
    return new Date(b.since ?? 0).getTime() - new Date(a.since ?? 0).getTime();
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmploymentListItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<EmploymentListItem | undefined>(undefined);

  const openForm = (employment?: EmploymentListItem) => {
    setEditing(employment);
    setFormOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployment(id),
    onSuccess: () => {
      toast.success("Company removed");
      refresh("employment");
      setDeleting(undefined);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove company"),
  });

  return (
    <div className="space-y-4">
      {/* The cards read off the filtered rows, so narrowing the table narrows them too. */}
      <CompanySummary employments={visible} isLoading={isLoading} />

      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, designation, CEO…"
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All stints</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEnumLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-4" />
                Clear filters
              </Button>
            )}
          </div>
          <Button onClick={() => openForm()}>
            <Plus className="size-4" />
            Add company
          </Button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No companies match the current filters."
                : "No companies yet. Add the place you work — work reports, to-dos and money entries all hang off it."}
            </p>
          ) : (
            <CompanyTable
              employments={visible}
              onEdit={(employment) => openForm(employment)}
              onDelete={(employment) => setDeleting(employment)}
            />
          )}
        </div>
      </div>

      <EmploymentFormDialog open={formOpen} onOpenChange={setFormOpen} employment={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Remove company?"
        description={
          deleting
            ? `This will permanently remove ${deleting.company.name}${
                deleting.designation ? ` — ${deleting.designation}` : ""
              } and all of its work reports.`
            : undefined
        }
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

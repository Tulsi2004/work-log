"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CustomFieldFilters } from "@/components/custom-fields/custom-field-filters";
import { MoneyTable } from "@/components/money/money-table";
import { MoneySummary } from "@/components/money/money-summary";
import { MoneyFormDialog } from "@/components/money/money-form-dialog";
import { useSalaryEntries, type SalaryEntryFilters } from "@/hooks/use-salary-entries";
import { useEmployments } from "@/hooks/use-employments";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { deleteSalaryEntry } from "@/actions/salary-entry-actions";
import { spendCategoryName } from "@/lib/money";
import { cn } from "@/lib/utils";
import { employmentLabel, formatDate, formatMoney } from "@/utils/format";
import type { SalaryEntryWithEmployment } from "@/types";

const ALL = "ALL";

const day = (date: Date) => format(date, "yyyy-MM-dd");

// The date ranges worth one click; anything else is the two date pickers.
const PERIODS = [
  {
    id: "thisMonth",
    label: "This month",
    range: () => ({ from: day(startOfMonth(new Date())), to: day(endOfMonth(new Date())) }),
  },
  {
    id: "lastMonth",
    label: "Last month",
    range: () => {
      const last = subMonths(new Date(), 1);
      return { from: day(startOfMonth(last)), to: day(endOfMonth(last)) };
    },
  },
  {
    id: "thisYear",
    label: "This year",
    range: () => ({ from: day(startOfYear(new Date())), to: day(endOfYear(new Date())) }),
  },
] as const;

export function MoneyPanel() {
  const queryClient = useQueryClient();
  const { data: employments } = useEmployments();

  const [search, setSearch] = useState("");
  const [employmentId, setEmploymentId] = useState(ALL);
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const debouncedSearch = useDebouncedValue(search);
  const debouncedCustomFilters = useDebouncedValue(customFilters);

  const hasActiveFilters =
    !!search ||
    employmentId !== ALL ||
    !!category ||
    !!dateFrom ||
    !!dateTo ||
    Object.values(customFilters).some(Boolean);

  const clearFilters = () => {
    setSearch("");
    setEmploymentId(ALL);
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setCustomFilters({});
  };

  const applyPeriod = (from: string, to: string) => {
    // Clicking the period you are already in clears it, the way the colour chips do.
    const same = dateFrom === from && dateTo === to;
    setDateFrom(same ? "" : from);
    setDateTo(same ? "" : to);
  };

  const filters: SalaryEntryFilters = {
    search: debouncedSearch,
    employmentId: employmentId === ALL ? undefined : employmentId,
    category: category || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    customFilters: debouncedCustomFilters,
  };
  const { data, isLoading } = useSalaryEntries(filters);
  const entries = data?.data ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SalaryEntryWithEmployment | undefined>(undefined);
  const [deletingEntry, setDeletingEntry] = useState<SalaryEntryWithEmployment | undefined>(undefined);

  const openForm = (entry?: SalaryEntryWithEmployment) => {
    setEditingEntry(entry);
    setFormOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSalaryEntry(id),
    onSuccess: () => {
      toast.success("Money entry deleted");
      queryClient.invalidateQueries({ queryKey: ["salary-entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeletingEntry(undefined);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete money entry"),
  });

  return (
    <div className="space-y-4">
      <MoneySummary
        entries={entries}
        totals={data?.totals}
        isLoading={isLoading}
        activeCategory={category || undefined}
        onCategoryClick={(next) => setCategory((current) => (current === next ? "" : next))}
      />

      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search source, notes or spends…"
                className="pl-8"
              />
            </div>
            <Select value={employmentId} onValueChange={setEmploymentId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All companies</SelectItem>
                {employments?.map((employment) => (
                  <SelectItem key={employment.id} value={employment.id}>
                    {employmentLabel(employment)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <DatePicker value={dateFrom} onChange={setDateFrom} className="w-full sm:w-36" placeholder="From" />
              <span className="text-sm text-muted-foreground">–</span>
              <DatePicker value={dateTo} onChange={setDateTo} className="w-full sm:w-36" placeholder="To" />
            </div>
            <CustomFieldFilters entity="SALARY_ENTRY" values={customFilters} onChange={setCustomFilters} />
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-4" />
                Clear filters
              </Button>
            )}
          </div>
          <Button onClick={() => openForm()}>
            <Plus className="size-4" />
            Add money
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PERIODS.map((period) => {
            const { from, to } = period.range();
            const selected = dateFrom === from && dateTo === to;
            return (
              <button
                key={period.id}
                type="button"
                onClick={() => applyPeriod(from, to)}
                aria-pressed={selected}
                className={cn(
                  "rounded-4xl border px-2.5 py-1 text-xs font-medium transition-colors",
                  selected
                    ? "border-transparent bg-secondary text-secondary-foreground ring-2 ring-ring/50"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {period.label}
              </button>
            );
          })}
          {category && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setCategory("")}>
              <X className="size-4" />
              {spendCategoryName(category)} only
            </Button>
          )}
        </div>

        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No money entries match the current filters."
                : "Nothing here yet. Add the money you received and what you did with it."}
            </p>
          ) : (
            <MoneyTable
              entries={entries}
              onEdit={(entry) => openForm(entry)}
              onDelete={(entry) => setDeletingEntry(entry)}
            />
          )}
        </div>
      </div>

      <MoneyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editingEntry}
        defaultEmploymentId={employmentId === ALL ? undefined : employmentId}
      />

      <ConfirmDialog
        open={!!deletingEntry}
        onOpenChange={(open) => !open && setDeletingEntry(undefined)}
        title="Delete money entry?"
        description={
          deletingEntry
            ? `This will permanently delete the ${formatMoney(deletingEntry.amount)} received on ${formatDate(deletingEntry.date)}.`
            : undefined
        }
        onConfirm={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
      />
    </div>
  );
}

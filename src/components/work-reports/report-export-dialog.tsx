"use client";

import { useState } from "react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { buildSearchParams } from "@/lib/query-params";
import { cn } from "@/lib/utils";
import { employmentLabel } from "@/utils/format";
import type { EmploymentWithCompany } from "@/types";

const day = (date: Date) => format(date, "yyyy-MM-dd");

// Weeks run Monday to Sunday — the working week a report is read by.
const WEEK = { weekStartsOn: 1 } as const;

function periodPresets(today = new Date()) {
  const lastWeek = subWeeks(today, 1);
  const lastMonth = subMonths(today, 1);
  return [
    { label: "This week", from: day(startOfWeek(today, WEEK)), to: day(endOfWeek(today, WEEK)) },
    { label: "Last week", from: day(startOfWeek(lastWeek, WEEK)), to: day(endOfWeek(lastWeek, WEEK)) },
    { label: "This month", from: day(startOfMonth(today)), to: day(endOfMonth(today)) },
    { label: "Last month", from: day(startOfMonth(lastMonth)), to: day(endOfMonth(lastMonth)) },
  ];
}

interface ReportExportDialogProps {
  // The company the Work log is showing; the report covers only that one.
  employment?: EmploymentWithCompany;
}

export function ReportExportDialog({ employment }: ReportExportDialogProps) {
  const presets = periodPresets();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(presets[2].from);
  const [to, setTo] = useState(presets[2].to);

  // yyyy-MM-dd compares correctly as plain text.
  const isBackwards = !!from && !!to && from > to;
  const canExport = !!employment && !!from && !!to && !isBackwards;

  const exportTo = (url: string, newTab: boolean) => {
    // The CSV comes back as an attachment, so pointing this tab at it downloads
    // the file without leaving the page; the printable report gets its own tab.
    if (newTab) window.open(url, "_blank");
    else window.location.assign(url);
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" disabled={!employment} onClick={() => setOpen(true)}>
        <FileDown className="size-4" />
        Export report
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* No focus jump onto the first chip, where its ring reads as a second selection. */}
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Export work report</DialogTitle>
            <DialogDescription>
              {employment ? employmentLabel(employment) : "No company selected"} — pick the period to
              send.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Period</Label>
            {/* The same chips as the money page's periods: a choice, not an action. */}
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => {
                const selected = preset.from === from && preset.to === to;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setFrom(preset.from);
                      setTo(preset.to);
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-4xl border px-2.5 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-transparent bg-secondary text-secondary-foreground ring-2 ring-ring/50"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <DatePicker value={from} onChange={setFrom} placeholder="From" className="flex-1" />
              <span className="text-muted-foreground">–</span>
              <DatePicker value={to} onChange={setTo} placeholder="To" className="flex-1" />
            </div>
            {isBackwards && <p className="text-xs text-destructive">The From date is after the To date.</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={!canExport}
              onClick={() =>
                exportTo(
                  `/api/export?${buildSearchParams({
                    format: "csv",
                    what: "work-reports",
                    employmentId: employment?.id,
                    dateFrom: from,
                    dateTo: to,
                  })}`,
                  false
                )
              }
            >
              <FileSpreadsheet className="size-4" />
              Download Excel (CSV)
            </Button>
            <Button
              type="button"
              disabled={!canExport}
              onClick={() =>
                exportTo(`/report/work?${buildSearchParams({ employmentId: employment?.id, from, to })}`, true)
              }
            >
              <Printer className="size-4" />
              Print / Save as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

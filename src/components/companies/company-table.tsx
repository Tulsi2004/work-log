"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDate, formatEnumLabel, formatMoney, formatTenure, formatTime } from "@/utils/format";
import { formatCustomValue } from "@/lib/custom-fields";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTableSort } from "@/hooks/use-table-sort";
import { currentPayRate, type EmploymentListItem, type PayRate } from "@/types";

interface CompanyTableProps {
  employments: EmploymentListItem[];
  onEdit: (employment: EmploymentListItem) => void;
  onDelete: (employment: EmploymentListItem) => void;
}

// "10th", "1st", "22nd" — how a pay day reads in a sentence.
function ordinal(day: number): string {
  const rest = day % 100;
  if (rest >= 11 && rest <= 13) return `${day}th`;
  return `${day}${["th", "st", "nd", "rd"][day % 10] ?? "th"}`;
}

export function CompanyTable({ employments, onEdit, onDelete }: CompanyTableProps) {
  // Empty by default, so the table keeps exactly the columns it always had.
  const { data: customFields = [] } = useCustomFields("EMPLOYMENT");

  // Period is the date a stint ran over, and the only column worth reordering
  // by — the rest read down the page in the order the panel hands them over.
  const { sorted, toggle, directionOf } = useTableSort(employments, {
    period: (employment: EmploymentListItem) =>
      employment.since ? new Date(employment.since).getTime() : null,
  });

  return (
    <div className="rounded-md border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[8%]">Company</TableHead>
            <TableHead className="w-[8%]">Designation</TableHead>
            <TableHead className="w-[6%]">Type</TableHead>
            <TableHead className="w-[6%]">Payment</TableHead>
            <TableHead className="w-[7%]">Pay from</TableHead>
            <TableHead className="w-[7%] text-right">Actual</TableHead>
            <TableHead className="w-[6%] text-right">PF</TableHead>
            <TableHead className="w-[7%] text-right">In-hand</TableHead>
            <TableHead className="w-[6%]">Pay day</TableHead>
            <SortableTableHead
              className="w-[9%]"
              direction={directionOf("period")}
              onSort={() => toggle("period")}
            >
              Period
            </SortableTableHead>
            <TableHead className="w-[7%]">Tenure</TableHead>
            <TableHead className="w-[7%]">Shift</TableHead>
            <TableHead className="w-[6%]">CEO</TableHead>
            <TableHead className="w-[7%]">Job source</TableHead>
            {customFields.map((field) => (
              <TableHead key={field.id} className="w-[8%]">
                {field.name}
              </TableHead>
            ))}
            <TableHead className="w-[3%] border-l" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((employment) => {
            const pay = currentPayRate(employment.payHistory);
            // Newest revision first, so the rate in force reads at the top.
            const rates = [...((employment.payHistory as PayRate[] | null) ?? [])].sort((a, b) =>
              b.effectiveFrom.localeCompare(a.effectiveFrom)
            );
            // The one in force is emphasised; the rest are the history behind it.
            const isInForce = (rate: PayRate) => rate.effectiveFrom === pay?.effectiveFrom;
            const tenure = formatTenure(employment.since, employment.until);
            const shiftFrom = formatTime(employment.company.defaultTimeFrom);
            const shiftTo = formatTime(employment.company.defaultTimeTo);
            const isCurrent = !employment.until || new Date(employment.until) >= new Date();

            return (
              <TableRow key={employment.id} className="group/row">
                <TableCell>
                  <div className="font-medium">{employment.company.name}</div>
                  {isCurrent && (
                    <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary">
                      Current
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {employment.designation || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatEnumLabel(employment.employmentType)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatEnumLabel(employment.paymentType)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rates.length ? (
                    <div className="space-y-0.5">
                      {rates.map((rate) => (
                        <div
                          key={rate.effectiveFrom}
                          className={cn(isInForce(rate) && "text-foreground")}
                        >
                          {formatDate(rate.effectiveFrom)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  {rates.length ? (
                    <div className="space-y-0.5">
                      {rates.map((rate) => (
                        <div
                          key={rate.effectiveFrom}
                          className={cn(!isInForce(rate) && "text-muted-foreground")}
                        >
                          {formatMoney(rate.actualSalary)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap text-muted-foreground">
                  {rates.length ? (
                    <div className="space-y-0.5">
                      {rates.map((rate) => (
                        <div key={rate.effectiveFrom}>{rate.pf > 0 ? formatMoney(rate.pf) : "—"}</div>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  {rates.length ? (
                    <div className="space-y-0.5">
                      {rates.map((rate) => (
                        <div
                          key={rate.effectiveFrom}
                          className={cn(
                            isInForce(rate) ? "font-semibold" : "text-muted-foreground"
                          )}
                        >
                          {formatMoney(rate.inHandSalary)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employment.payDay ? ordinal(employment.payDay) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employment.since || employment.until
                    ? `${employment.since ? formatDate(employment.since) : "—"} – ${
                        employment.until ? formatDate(employment.until) : "Present"
                      }`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{tenure || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {shiftFrom || shiftTo ? `${shiftFrom || "—"} to ${shiftTo || "—"}` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employment.company.ceoName || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employment.company.jobSource || "—"}
                </TableCell>
                {customFields.map((field) => (
                  <TableCell key={field.id} className="text-muted-foreground">
                    {formatCustomValue(field, employment.customValues[field.id])}
                  </TableCell>
                ))}
                <TableCell className="border-l">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(employment)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(employment)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

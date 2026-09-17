"use client";

import { differenceInMonths } from "date-fns";
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
import { customSortValue } from "@/lib/table-sort";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTableSort, type SortAccessors, type SortValue } from "@/hooks/use-table-sort";
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

/** Months served, so the Tenure column sorts by length rather than by its label. */
function tenureMonths(employment: EmploymentListItem): SortValue {
  if (!employment.since) return null;
  return differenceInMonths(
    employment.until ? new Date(employment.until) : new Date(),
    new Date(employment.since)
  );
}

export function CompanyTable({ employments, onEdit, onDelete }: CompanyTableProps) {
  // Empty by default, so the table keeps exactly the columns it always had.
  const { data: customFields = [] } = useCustomFields("EMPLOYMENT");

  // Pay columns sort on the rate in force — the cell lists the history newest
  // first, so the column orders by the line it leads with.
  const accessors: SortAccessors<EmploymentListItem, string> = {
    company: (e) => e.company.name,
    designation: (e) => e.designation,
    type: (e) => e.employmentType,
    payment: (e) => e.paymentType,
    payFrom: (e) => currentPayRate(e.payHistory)?.effectiveFrom,
    actual: (e) => currentPayRate(e.payHistory)?.actualSalary,
    pf: (e) => currentPayRate(e.payHistory)?.pf,
    inHand: (e) => currentPayRate(e.payHistory)?.inHandSalary,
    payDay: (e) => e.payDay,
    period: (e) => (e.since ? new Date(e.since).getTime() : null),
    tenure: tenureMonths,
    shift: (e) => e.company.defaultTimeFrom,
    ceo: (e) => e.company.ceoName,
    jobSource: (e) => e.company.jobSource,
    ...Object.fromEntries(
      customFields.map((field) => [
        field.id,
        (e: EmploymentListItem) => customSortValue(field, e.customValues[field.id]),
      ])
    ),
  };

  const { sorted, toggle, directionOf } = useTableSort(employments, accessors);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead direction={directionOf("company")} onSort={() => toggle("company")}>
              Company
            </SortableTableHead>
            <SortableTableHead
              direction={directionOf("designation")}
              onSort={() => toggle("designation")}
            >
              Designation
            </SortableTableHead>
            <SortableTableHead direction={directionOf("type")} onSort={() => toggle("type")}>
              Type
            </SortableTableHead>
            <SortableTableHead direction={directionOf("payment")} onSort={() => toggle("payment")}>
              Payment
            </SortableTableHead>
            <SortableTableHead direction={directionOf("payFrom")} onSort={() => toggle("payFrom")}>
              Pay from
            </SortableTableHead>
            <SortableTableHead
              align="right"
              direction={directionOf("actual")}
              onSort={() => toggle("actual")}
            >
              Actual
            </SortableTableHead>
            <SortableTableHead
              align="right"
              direction={directionOf("pf")}
              onSort={() => toggle("pf")}
            >
              PF
            </SortableTableHead>
            <SortableTableHead
              align="right"
              direction={directionOf("inHand")}
              onSort={() => toggle("inHand")}
            >
              In-hand
            </SortableTableHead>
            <SortableTableHead direction={directionOf("payDay")} onSort={() => toggle("payDay")}>
              Pay day
            </SortableTableHead>
            <SortableTableHead direction={directionOf("period")} onSort={() => toggle("period")}>
              Period
            </SortableTableHead>
            <SortableTableHead direction={directionOf("tenure")} onSort={() => toggle("tenure")}>
              Tenure
            </SortableTableHead>
            <SortableTableHead direction={directionOf("shift")} onSort={() => toggle("shift")}>
              Shift
            </SortableTableHead>
            <SortableTableHead direction={directionOf("ceo")} onSort={() => toggle("ceo")}>
              CEO
            </SortableTableHead>
            <SortableTableHead
              direction={directionOf("jobSource")}
              onSort={() => toggle("jobSource")}
            >
              Job source
            </SortableTableHead>
            {customFields.map((field) => (
              <SortableTableHead
                key={field.id}
                direction={directionOf(field.id)}
                onSort={() => toggle(field.id)}
              >
                {field.name}
              </SortableTableHead>
            ))}
            <TableHead className="w-10 border-l" />
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
                <TableCell className="text-right tabular-nums">
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
                <TableCell className="text-right tabular-nums text-muted-foreground">
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
                <TableCell className="text-right tabular-nums">
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

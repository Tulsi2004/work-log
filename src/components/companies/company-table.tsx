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
import { currentPayRate, type EmploymentListItem, type PayRate } from "@/types";

interface CompanyTableProps {
  employments: EmploymentListItem[];
  onEdit: (employment: EmploymentListItem) => void;
  onDelete: (employment: EmploymentListItem) => void;
}

/** The row menu is pinned to the right edge so it stays reachable however wide the table gets. */
const STICKY_ACTIONS = "sticky right-0 border-l";

// "10th", "1st", "22nd" — how a pay day reads in a sentence.
function ordinal(day: number): string {
  const rest = day % 100;
  if (rest >= 11 && rest <= 13) return `${day}th`;
  return `${day}${["th", "st", "nd", "rd"][day % 10] ?? "th"}`;
}

export function CompanyTable({ employments, onEdit, onDelete }: CompanyTableProps) {
  // Empty by default, so the table keeps exactly the columns it always had.
  const { data: customFields = [] } = useCustomFields("EMPLOYMENT");

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-32">Company</TableHead>
            <TableHead className="min-w-32">Designation</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="min-w-28">Pay from</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">PF</TableHead>
            <TableHead className="text-right">In-hand</TableHead>
            <TableHead>Pay day</TableHead>
            <TableHead className="min-w-40">Period</TableHead>
            <TableHead>Tenure</TableHead>
            <TableHead className="min-w-32">Shift</TableHead>
            <TableHead className="min-w-28">CEO</TableHead>
            <TableHead className="min-w-28">Job source</TableHead>
            {customFields.map((field) => (
              <TableHead key={field.id} className="min-w-32">
                {field.name}
              </TableHead>
            ))}
            <TableHead className={cn(STICKY_ACTIONS, "w-10 bg-background")} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {employments.map((employment) => {
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
                <TableCell className="whitespace-normal">
                  <div className="font-medium">{employment.company.name}</div>
                  {isCurrent && (
                    <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary">
                      Current
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {employment.designation || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatEnumLabel(employment.employmentType)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatEnumLabel(employment.paymentType)}</Badge>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {rates.length ? (
                    <div className="space-y-0.5">
                      {rates.map((rate) => (
                        <div key={rate.effectiveFrom} className={cn(isInForce(rate) && "text-foreground")}>
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
                        <div key={rate.effectiveFrom} className={cn(!isInForce(rate) && "text-muted-foreground")}>
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
                <TableCell className="whitespace-normal text-muted-foreground">
                  {employment.since || employment.until
                    ? `${employment.since ? formatDate(employment.since) : "—"} – ${
                        employment.until ? formatDate(employment.until) : "Present"
                      }`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{tenure || "—"}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {shiftFrom || shiftTo ? `${shiftFrom || "—"} to ${shiftTo || "—"}` : "—"}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {employment.company.ceoName || "—"}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {employment.company.jobSource || "—"}
                </TableCell>
                {customFields.map((field) => (
                  <TableCell key={field.id} className="whitespace-normal text-muted-foreground">
                    {formatCustomValue(field, employment.customValues[field.id])}
                  </TableCell>
                ))}
                <TableCell className={cn(STICKY_ACTIONS, "bg-background group-hover/row:bg-muted/50")}>
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

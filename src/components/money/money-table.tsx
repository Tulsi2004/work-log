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
import { spendCategoryMeta, sumSaved, sumSpent } from "@/lib/money";
import { formatDate, formatDay, formatMoney } from "@/utils/format";
import { formatCustomValue } from "@/lib/custom-fields";
import { useCustomFields } from "@/hooks/use-custom-fields";
import type { SalaryEntryWithEmployment } from "@/types";

interface MoneyTableProps {
  entries: SalaryEntryWithEmployment[];
  onEdit: (entry: SalaryEntryWithEmployment) => void;
  onDelete: (entry: SalaryEntryWithEmployment) => void;
}

/** The row menu is pinned to the right edge so it stays reachable however wide the table gets. */
const STICKY_ACTIONS = "sticky right-0 border-l";

export function MoneyTable({ entries, onEdit, onDelete }: MoneyTableProps) {
  // Empty by default, so the table keeps exactly the columns it always had.
  const { data: customFields = [] } = useCustomFields("SALARY_ENTRY");

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="min-w-32">Company</TableHead>
            <TableHead className="min-w-48">What you did with it</TableHead>
            <TableHead className="min-w-28">Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Spent</TableHead>
            <TableHead className="text-right">Saved</TableHead>
            <TableHead className="w-40 min-w-32">Notes</TableHead>
            {customFields.map((field) => (
              <TableHead key={field.id} className="min-w-32">
                {field.name}
              </TableHead>
            ))}
            <TableHead className={cn(STICKY_ACTIONS, "w-10 bg-background")} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const spent = sumSpent(entry.spends);
            const saved = sumSaved(entry.spends);
            const hasSpends = entry.spends.length > 0;

            return (
              <TableRow key={entry.id} className="group/row">
                <TableCell>
                  <div className="font-medium">{formatDate(entry.date)}</div>
                  <div className="text-xs text-muted-foreground">{formatDay(entry.date)}</div>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMoney(entry.amount)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {entry.source ? (
                    <Badge variant="secondary">{entry.source}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {entry.employment ? (
                    <>
                      {entry.employment.company.name}
                      {entry.employment.designation && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {entry.employment.designation}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Personal</span>
                  )}
                </TableCell>

                {/* These three columns line up row for row, the way tasks line up
                    with their project and who assigned them. */}
                <TableCell className="whitespace-normal">
                  {hasSpends ? (
                    <ol className="list-decimal space-y-0.5 pl-4">
                      {entry.spends.map((spend, index) => (
                        <li key={index}>{spend.what}</li>
                      ))}
                    </ol>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {hasSpends ? (
                    <div className="space-y-0.5">
                      {entry.spends.map((spend, index) => {
                        const meta = spendCategoryMeta(spend.category);
                        return (
                          <div key={index}>
                            <Badge variant="secondary" className={meta.badge}>
                              {meta.name}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {hasSpends ? (
                    <div className="space-y-0.5">
                      {entry.spends.map((spend, index) => (
                        <div key={index}>{formatMoney(spend.amount)}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatMoney(spent)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatMoney(saved)}
                </TableCell>
                <TableCell className="w-40 max-w-40 break-words whitespace-normal text-muted-foreground">
                  {entry.note || "—"}
                </TableCell>
                {customFields.map((field) => (
                  <TableCell key={field.id} className="whitespace-normal text-muted-foreground">
                    {formatCustomValue(field, entry.customValues[field.id])}
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
                      <DropdownMenuItem onSelect={() => onEdit(entry)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(entry)}>
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

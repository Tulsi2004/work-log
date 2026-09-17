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
import { spendCategoryMeta, sumSaved, sumSpent } from "@/lib/money";
import { formatDate, formatDay, formatMoney } from "@/utils/format";
import { formatCustomValue } from "@/lib/custom-fields";
import { customSortValue } from "@/lib/table-sort";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTableSort, type SortAccessors } from "@/hooks/use-table-sort";
import type { SalaryEntryWithEmployment } from "@/types";

interface MoneyTableProps {
  entries: SalaryEntryWithEmployment[];
  onEdit: (entry: SalaryEntryWithEmployment) => void;
  onDelete: (entry: SalaryEntryWithEmployment) => void;
}

export function MoneyTable({ entries, onEdit, onDelete }: MoneyTableProps) {
  // Empty by default, so the table keeps exactly the columns it always had.
  const { data: customFields = [] } = useCustomFields("SALARY_ENTRY");

  // The three spend columns list one line per spend, so they sort on the first
  // line — the same thing the eye lands on when scanning the column.
  const accessors: SortAccessors<SalaryEntryWithEmployment, string> = {
    date: (e) => new Date(e.date).getTime(),
    received: (e) => e.amount,
    source: (e) => e.source,
    company: (e) => e.employment?.company.name ?? "Personal",
    what: (e) => e.spends[0]?.what,
    category: (e) => e.spends[0] && spendCategoryMeta(e.spends[0].category).name,
    amount: (e) => e.spends[0]?.amount,
    spent: (e) => sumSpent(e.spends),
    saved: (e) => sumSaved(e.spends),
    note: (e) => e.note,
    ...Object.fromEntries(
      customFields.map((field) => [
        field.id,
        (e: SalaryEntryWithEmployment) => customSortValue(field, e.customValues[field.id]),
      ])
    ),
  };

  const { sorted, toggle, directionOf } = useTableSort(entries, accessors);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead direction={directionOf("date")} onSort={() => toggle("date")}>
              Date
            </SortableTableHead>
            <SortableTableHead
              align="right"
              direction={directionOf("received")}
              onSort={() => toggle("received")}
            >
              Received
            </SortableTableHead>
            <SortableTableHead direction={directionOf("source")} onSort={() => toggle("source")}>
              Source
            </SortableTableHead>
            <SortableTableHead direction={directionOf("company")} onSort={() => toggle("company")}>
              Company
            </SortableTableHead>
            <SortableTableHead direction={directionOf("what")} onSort={() => toggle("what")}>
              What you did with it
            </SortableTableHead>
            <SortableTableHead
              direction={directionOf("category")}
              onSort={() => toggle("category")}
            >
              Category
            </SortableTableHead>
            <SortableTableHead
              align="right"
              direction={directionOf("amount")}
              onSort={() => toggle("amount")}
            >
              Amount
            </SortableTableHead>
            <SortableTableHead
              align="right"
              direction={directionOf("spent")}
              onSort={() => toggle("spent")}
            >
              Spent
            </SortableTableHead>
            <SortableTableHead
              align="right"
              direction={directionOf("saved")}
              onSort={() => toggle("saved")}
            >
              Saved
            </SortableTableHead>
            <SortableTableHead direction={directionOf("note")} onSort={() => toggle("note")}>
              Notes
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
          {sorted.map((entry) => {
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
                <TableCell>
                  {entry.source ? (
                    <Badge variant="secondary">{entry.source}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
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
                <TableCell>
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
                <TableCell>
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
                <TableCell className="text-muted-foreground">{entry.note || "—"}</TableCell>
                {customFields.map((field) => (
                  <TableCell key={field.id} className="text-muted-foreground">
                    {formatCustomValue(field, entry.customValues[field.id])}
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

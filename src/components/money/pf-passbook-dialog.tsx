"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pfTotals, type PfRow } from "@/lib/pf-passbook";
import { formatDate, formatMoney } from "@/utils/format";

interface PfPassbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: PfRow[];
}

// A copy of the EPFO passbook worked out from the pay history, so it holds no
// real credit dates and no interest — EPFO adds that after the year ends in March.
export function PfPassbookDialog({ open, onOpenChange, rows }: PfPassbookDialogProps) {
  const totals = pfTotals(rows);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>PF passbook</DialogTitle>
          <DialogDescription>
            Worked out from your pay history. Dates are the deposit deadline, not EPFO&apos;s credit date, and
            interest isn&apos;t included.
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wage month</TableHead>
              <TableHead>Due by</TableHead>
              <TableHead className="text-right">Employee</TableHead>
              <TableHead className="text-right">Employer</TableHead>
              <TableHead className="text-right">Pension</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{format(new Date(`${row.wageMonth}-01T00:00`), "MMM yyyy")}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(`${row.dueOn}T00:00`)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.employee)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.employer)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.pension)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Balance {formatMoney(totals.total)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(totals.employee)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(totals.employer)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(totals.pension)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

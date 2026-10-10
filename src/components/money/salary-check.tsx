"use client";

import { format } from "date-fns";
import { ArrowUpCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sumMoney } from "@/lib/money";
import { employmentLabel, formatMoney } from "@/utils/format";
import { rateForPayment, type PayRate, type SalaryEntryWithEmployment } from "@/types";

interface CheckRow {
  key: string;
  paidOn: Date;
  // The month the pay was for — the one before it landed.
  forMonth: Date;
  company: string;
  expected: number;
  received: number;
  // The month you joined or left, so a short amount is expected rather than wrong.
  partial: boolean;
}

// The day a stint began: its own start date when set, otherwise the first pay
// rate — a rate cannot start before the job did.
function startedOn(entry: SalaryEntryWithEmployment): string | undefined {
  const since = entry.employment?.since;
  if (since) return new Date(since).toISOString().slice(0, 10);
  const rates = (entry.employment?.payHistory as PayRate[] | null) ?? [];
  return rates.map((r) => r.effectiveFrom).sort()[0];
}

// Each salary set against the in-hand pay of the month it was for. Only entries
// whose source says "Salary" count — a bonus or a stipend has no expected amount.
// ponytail: the expected figure is a full month's in-hand pay; a month cut short
// by unpaid leave or fewer hours reads as short. The Salary page works out the
// exact figure for a cycle.
function checkRows(entries: SalaryEntryWithEmployment[]): CheckRow[] {
  const rows = new Map<string, CheckRow>();
  for (const entry of entries) {
    if (!entry.employment || !/salary/i.test(entry.source ?? "")) continue;
    const paidOn = new Date(entry.date);
    const rate = rateForPayment(entry.employment.payHistory, paidOn);
    if (!rate?.inHandSalary) continue;

    // Two credits in one month for one company are one salary paid in parts.
    const key = `${entry.employmentId}:${paidOn.toISOString().slice(0, 7)}`;
    const forMonth = new Date(Date.UTC(paidOn.getUTCFullYear(), paidOn.getUTCMonth() - 1, 1));
    const forKey = forMonth.toISOString().slice(0, 7);
    const until = entry.employment.until ? new Date(entry.employment.until).toISOString().slice(0, 7) : undefined;
    const row = rows.get(key) ?? {
      key,
      paidOn,
      forMonth,
      company: employmentLabel(entry.employment),
      expected: rate.inHandSalary,
      received: 0,
      partial: startedOn(entry)?.slice(0, 7) === forKey || until === forKey,
    };
    row.received = sumMoney([row.received, entry.amount]);
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.paidOn.getTime() - a.paidOn.getTime());
}

function Status({ row }: { row: CheckRow }) {
  const difference = sumMoney([row.received, -row.expected]);
  // A rupee or two is rounding, not a shortfall.
  if (Math.abs(difference) < 1) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" /> As expected
      </span>
    );
  }
  if (difference > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <ArrowUpCircle className="size-3.5" /> {formatMoney(difference)} more
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
      <TriangleAlert className="size-3.5" /> {formatMoney(-difference)} short
      {row.partial && <span className="text-muted-foreground">· partial month</span>}
    </span>
  );
}

export function SalaryCheck({ entries }: { entries: SalaryEntryWithEmployment[] }) {
  const rows = checkRows(entries);

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No salaries to check. Entries count when they are linked to a company with a pay rate and their
        source says &ldquo;Salary&rdquo;.
      </p>
    );
  }

  const expected = sumMoney(rows.map((r) => r.expected));
  const received = sumMoney(rows.map((r) => r.received));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Over {rows.length} {rows.length === 1 ? "salary" : "salaries"} you received{" "}
        <span className="font-medium text-foreground">{formatMoney(received)}</span> against{" "}
        <span className="font-medium text-foreground">{formatMoney(expected)}</span> in-hand pay
        {received < expected ? ` — ${formatMoney(sumMoney([expected, -received]))} less` : ""}. Expected is a
        full month&apos;s in-hand pay for the month the salary was for.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paid</TableHead>
            <TableHead>For</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Received</TableHead>
            {/* Room after the right-aligned amounts, so the last amount and its verdict do not run together. */}
            <TableHead className="pl-8">Check</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>{format(row.paidOn, "d MMM yyyy")}</TableCell>
              <TableCell>{format(row.forMonth, "MMM yyyy")}</TableCell>
              <TableCell className="max-w-48 truncate">{row.company}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(row.expected)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(row.received)}</TableCell>
              <TableCell className="pl-8">
                <Status row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

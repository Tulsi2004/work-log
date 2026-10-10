"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { INVESTMENT_TYPE_NAMES, hasMatured, sumMoney, type SalarySpend } from "@/lib/money";
import { formatDate, formatMoney } from "@/utils/format";
import type { SalaryEntryWithEmployment } from "@/types";

// How far ahead a maturity is worth a reminder.
const REMIND_WITHIN_DAYS = 30;

interface Investment {
  spend: SalarySpend;
  entry: SalaryEntryWithEmployment;
}

function investmentsOf(entries: SalaryEntryWithEmployment[]): Investment[] {
  return entries.flatMap((entry) =>
    entry.spends.filter((spend) => spend.category === "INVESTMENT").map((spend) => ({ spend, entry }))
  );
}

const today = () => format(new Date(), "yyyy-MM-dd");

const daysLeft = (maturesOn: string) => differenceInCalendarDays(parseISO(maturesOn), new Date());

// Running ones first, soonest to mature at the top; then ones with no date;
// matured ones last.
function rank({ spend }: Investment, now: string): [number, string] {
  if (!spend.maturesOn) return [1, ""];
  return hasMatured(spend, now) ? [2, spend.maturesOn] : [0, spend.maturesOn];
}

function Status({ spend }: { spend: SalarySpend }) {
  if (!spend.maturesOn) return <span className="text-muted-foreground">No maturity date</span>;
  const days = daysLeft(spend.maturesOn);
  if (days <= 0) return <span className="text-muted-foreground">Matured</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        days <= REMIND_WITHIN_DAYS ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"
      )}
    >
      {days <= REMIND_WITHIN_DAYS && <BellRing className="size-3.5" />}
      Matures in {days} {days === 1 ? "day" : "days"}
    </span>
  );
}

// Every investment you have recorded, whatever the page filters — a maturity
// date is no less due because you are looking at another month.
export function InvestmentList({
  entries,
  onEdit,
}: {
  entries: SalaryEntryWithEmployment[];
  onEdit: (entry: SalaryEntryWithEmployment) => void;
}) {
  const now = today();
  const investments = investmentsOf(entries).sort((a, b) => {
    const [ra, da] = rank(a, now);
    const [rb, db] = rank(b, now);
    return ra - rb || da.localeCompare(db);
  });

  if (!investments.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No investments yet. Add a spend with the Investment category to a money entry — you can say what kind
        it is and when it matures.
      </p>
    );
  }

  const running = investments.filter(({ spend }) => !hasMatured(spend, now));
  const matured = investments.filter(({ spend }) => hasMatured(spend, now));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Running: <span className="font-medium text-foreground">{formatMoney(sumMoney(running.map((i) => i.spend.amount)))}</span>{" "}
        across {running.length}
        {matured.length > 0 &&
          ` · Matured: ${formatMoney(sumMoney(matured.map((i) => i.spend.amount)))} across ${matured.length}`}
        . Click a row to change its details.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>What</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Invested</TableHead>
            <TableHead>Matures</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.map(({ spend, entry }, index) => (
            <TableRow
              key={`${entry.id}:${index}`}
              onClick={() => onEdit(entry)}
              className={cn("cursor-pointer", hasMatured(spend, now) && "opacity-60")}
            >
              <TableCell className="max-w-56 truncate font-medium">{spend.what}</TableCell>
              <TableCell>{spend.investmentType ? INVESTMENT_TYPE_NAMES[spend.investmentType] : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(spend.amount)}</TableCell>
              <TableCell>{formatDate(entry.date)}</TableCell>
              <TableCell>{spend.maturesOn ? formatDate(parseISO(spend.maturesOn)) : "—"}</TableCell>
              <TableCell>
                <Status spend={spend} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// The reminder: shown at the top of the money page while anything matures
// within the next month, so it is seen without opening the tab.
export function MaturityReminder({
  entries,
  onView,
}: {
  entries: SalaryEntryWithEmployment[];
  onView: () => void;
}) {
  const now = today();
  const soon = investmentsOf(entries)
    .filter(({ spend }) => spend.maturesOn && !hasMatured(spend, now) && daysLeft(spend.maturesOn) <= REMIND_WITHIN_DAYS)
    .sort((a, b) => a.spend.maturesOn!.localeCompare(b.spend.maturesOn!));

  if (!soon.length) return null;
  const [first] = soon;
  const days = daysLeft(first.spend.maturesOn!);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <BellRing className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
      <p className="flex-1">
        <span className="font-medium">{first.spend.what}</span> ({formatMoney(first.spend.amount)}) matures in{" "}
        {days} {days === 1 ? "day" : "days"}, on {formatDate(parseISO(first.spend.maturesOn!))}
        {soon.length > 1 && ` — and ${soon.length - 1} more within ${REMIND_WITHIN_DAYS} days`}.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onView}>
        View investments
      </Button>
    </div>
  );
}

import { roundMoney, sumMoney, toMoney } from "@/lib/money";
import { rateForPayment } from "@/types";

interface PaidEntry {
  date: Date | string;
  employmentId: string | null;
  employment?: { payHistory: unknown } | null;
}

export interface PfRow {
  key: string;
  // The month worked, yyyy-MM — pay lands a month in arrears.
  wageMonth: string;
  // The 15th of the month the salary was paid, not EPFO's real credit date.
  dueOn: string;
  employee: number;
  employer: number;
  pension: number;
  total: number;
}

// PF never reaches your hands, so no entry records it — it is read off the
// company's pay history, at the rate of the month the pay was for. The `pf` on a
// rate is the whole deposit: half is the employee's, and the employer's half
// loses whatever goes to the pension scheme. The company deposits by the 15th of
// the month the salary was paid — until then a month is left out, so this matches
// the EPF passbook rather than running a month ahead of it.
// ponytail: one PF per company per month, so a bonus-only month still counts one.
// ponytail: assumes the company deposits by the due date; a late one reads early.
export function pfPassbook(entries: PaidEntry[], today: string): PfRow[] {
  const rows = new Map<string, PfRow>();
  for (const entry of entries) {
    if (!entry.employment) continue;
    const paidOn = new Date(entry.date);
    const paidMonth = paidOn.toISOString().slice(0, 7);
    const dueOn = `${paidMonth}-15`;
    if (dueOn > today) continue;

    const rate = rateForPayment(entry.employment.payHistory, paidOn);
    const total = toMoney(rate?.pf);
    if (total === 0) continue;

    const employee = roundMoney(total / 2);
    const pension = toMoney(rate?.pension);
    const key = `${entry.employmentId}:${paidMonth}`;
    rows.set(key, {
      key,
      wageMonth: new Date(Date.UTC(paidOn.getUTCFullYear(), paidOn.getUTCMonth() - 1, 1)).toISOString().slice(0, 7),
      dueOn,
      employee,
      employer: roundMoney(total - employee - pension),
      pension,
      total,
    });
  }
  return [...rows.values()].sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}

export function pfTotals(rows: PfRow[]) {
  return {
    employee: sumMoney(rows.map((row) => row.employee)),
    employer: sumMoney(rows.map((row) => row.employer)),
    pension: sumMoney(rows.map((row) => row.pension)),
    total: sumMoney(rows.map((row) => row.total)),
  };
}

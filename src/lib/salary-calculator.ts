import { format } from "date-fns";
import { payRateOn, type PayRate } from "@/types";
import { roundMoney } from "@/lib/money";

// A full day's work is 8h 20m. Every rupee is earned against this — a day's pay
// buys exactly this many minutes, so pay per minute falls out of it.
export const MINUTES_PER_DAY = 500;

// Pay runs 6th to 5th rather than over a calendar month. Kept as a preference
// so a job on a different cycle only has to be told once.
export const CYCLE_START_DAY_PREFERENCE_KEY = "salary.cycleStartDay";
export const DEFAULT_CYCLE_START_DAY = 6;

export function readCycleStartDay(value: unknown): number {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 28) return DEFAULT_CYCLE_START_DAY;
  return day;
}

// A cycle is named by the month it ends in — the month you are paid for it — so
// "2026-08" is the 6 Jul – 5 Aug run. Held as yyyy-MM, the shape `payRateOn`
// already compares against.
export type CycleKey = string;

export function monthKey(year: number, month: number): CycleKey {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export interface Cycle {
  key: CycleKey;
  start: Date;
  end: Date;
  totalDays: number;
  // Days that count toward the hours goal: every day of the cycle bar Sundays.
  goalDays: number;
  sundays: number;
  label: string;
}

export function buildCycle(key: CycleKey, startDay: number): Cycle {
  const [year, month] = key.split("-").map(Number);

  // A cycle starting on the 1st is just the calendar month; any other start day
  // reaches back into the month before.
  const start = startDay <= 1 ? new Date(year, month - 1, 1) : new Date(year, month - 2, startDay);
  const end = startDay <= 1 ? new Date(year, month, 0) : new Date(year, month - 1, startDay - 1);

  let totalDays = 0;
  let sundays = 0;
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    totalDays += 1;
    if (day.getDay() === 0) sundays += 1;
  }

  return {
    key,
    start,
    end,
    totalDays,
    goalDays: totalDays - sundays,
    sundays,
    label: formatCycle(start, end),
  };
}

// "6 Jul – 5 Aug 2026" — the year is said once unless the cycle straddles two.
function formatCycle(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

// A cycle is paid at the rate in force when it *began*. A hike dated 5 Sep is
// earned over the 6 Sep – 5 Oct cycle, so it belongs to that one and not to the
// 6 Aug – 5 Sep cycle that merely happened to close on the same day.
export function rateForCycle(payHistory: unknown, cycle: Cycle): PayRate | undefined {
  return payRateOn(payHistory, format(cycle.start, "yyyy-MM-dd"));
}

// When the money actually lands: the first time the pay day comes round on or
// after the cycle closes. A cycle ending 5 Oct with a pay day of the 10th is
// paid 10 Oct; one with a pay day of the 3rd waits until 3 Nov.
export function payDateFor(cycle: Cycle, payDay?: number | null): Date | undefined {
  if (!payDay || payDay < 1 || payDay > 31) return undefined;

  const onMonth = (year: number, month: number) => {
    // Day 0 of the next month is the last day of this one, so a pay day past the
    // end of a short month falls on its last day.
    const days = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(payDay, days));
  };

  const due = onMonth(cycle.end.getFullYear(), cycle.end.getMonth());
  return due >= cycle.end ? due : onMonth(cycle.end.getFullYear(), cycle.end.getMonth() + 1);
}

// Durations are typed as "h:mm" and worked in minutes — a cycle's total runs to
// three digits of hours, so this is a plain text field, never an <input type=time>.
// Bare "8" reads as 8 hours; "8:20" as 500 minutes. Anything unparseable is 0.
export function parseDuration(value: string): number {
  const text = value.trim();
  if (!text) return 0;
  const [hours, minutes = "0"] = text.split(":");
  const h = Number(hours);
  const m = Number(minutes);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.round(Math.abs(h) * 60 + Math.abs(m));
}

export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const total = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// The same duration said the way the money is worked out. Every rupee here is
// bought per minute, so a typed "217:45" is worth seeing as the 13,065 it is.
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  return `${total.toLocaleString("en-IN")} min`;
}

// "217:45 = 13,065 min" — the conversion spelled out, for a field being typed.
export function explainDuration(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const minutes = parseDuration(value);
  return `${formatDuration(minutes)} = ${formatMinutes(minutes)}`;
}

// A penalty taken off, or festival hours handed to you. Each one is typed as a
// duration and carries its own direction, so the breakdown reads as arithmetic.
export interface MinuteAdjustment {
  id: string;
  label: string;
  duration: string;
  // "add" for hours credited, "deduct" for a penalty.
  direction: "add" | "deduct";
}

export interface SalaryInputs {
  // Hours clocked over the cycle, breaks included — the portal's "Total".
  totalHours: string;
  // Break time, which is inside the clocked total but is not worked.
  breakHours: string;
  // A paid leave is not clocked, so it is credited at whatever a day of yours
  // averages — the portal's "Avg Daily Hours" for the cycle.
  avgDailyHours: string;
  // How many paid leaves the cycle carried. One a month is the allowance, but a
  // cycle you did not take one in credits nothing.
  paidLeaveDays: number;
  adjustments: MinuteAdjustment[];
  // Days the hours goal is set over. Defaults to the cycle's own count, and is
  // editable for a cycle your company counted differently.
  goalDays: number;
  // Defaults to the PF on the pay rate, editable for a cycle that differed.
  pf: number;
}

export interface MinuteLine {
  label: string;
  minutes: number;
  // Which way the line points, kept apart from the amount so an empty break
  // still reads as "− 0:00" rather than flipping to a plus at zero.
  sign: 1 | -1;
}

export interface SalaryCalcResult {
  actualSalary: number;
  goalDays: number;
  // What a full cycle is worth in minutes — goal days at 8h 20m each.
  expectedMinutes: number;
  oneDaySalary: number;
  perMinute: number;

  minuteLines: MinuteLine[];
  calculatedMinutes: number;
  // What the paid leave came to, so the field can show its own working.
  paidLeaveMinutes: number;

  earned: number;
  pf: number;
  net: number;

  // Whether anything has actually been typed in. With nothing entered the net
  // would read as minus the PF, which is a figure rather than an answer.
  hasInput: boolean;
}

export function calculateSalary(
  rate: PayRate | undefined,
  inputs: SalaryInputs
): SalaryCalcResult {
  const actualSalary = rate?.actualSalary ?? 0;
  const goalDays = inputs.goalDays > 0 ? inputs.goalDays : 0;
  const expectedMinutes = goalDays * MINUTES_PER_DAY;

  const oneDaySalary = goalDays > 0 ? actualSalary / goalDays : 0;
  const perMinute = oneDaySalary / MINUTES_PER_DAY;

  // Break comes off the clocked total, paid leave goes on at an average day,
  // then whatever else the cycle threw at you.
  const avgDayMinutes = parseDuration(inputs.avgDailyHours);
  const paidLeaveDays = Math.max(0, inputs.paidLeaveDays);
  const paidLeaveMinutes = Math.round(avgDayMinutes * paidLeaveDays);

  const minuteLines: MinuteLine[] = [
    { label: "Total hours", minutes: parseDuration(inputs.totalHours), sign: 1 },
    { label: "Break", minutes: -parseDuration(inputs.breakHours), sign: -1 },
    {
      label: paidLeaveDays === 1
        ? `Paid leave (${formatDuration(avgDayMinutes)})`
        : `Paid leave (${paidLeaveDays} × ${formatDuration(avgDayMinutes)})`,
      minutes: paidLeaveMinutes,
      sign: 1,
    },
    ...inputs.adjustments.map<MinuteLine>((adjustment) => ({
      label: adjustment.label.trim() || (adjustment.direction === "add" ? "Added" : "Penalty"),
      minutes:
        adjustment.direction === "add"
          ? parseDuration(adjustment.duration)
          : -parseDuration(adjustment.duration),
      sign: adjustment.direction === "add" ? 1 : -1,
    })),
  ];

  const calculatedMinutes = minuteLines.reduce((total, line) => total + line.minutes, 0);
  const hasInput = minuteLines.some((line) => line.minutes !== 0);

  // Rounded only at the end — rounding the per-minute rate first would drift by
  // rupees over a cycle's worth of minutes.
  const earned = roundMoney(perMinute * calculatedMinutes);
  const pf = roundMoney(inputs.pf);

  return {
    actualSalary,
    goalDays,
    expectedMinutes,
    oneDaySalary,
    perMinute,
    minuteLines,
    calculatedMinutes,
    paidLeaveMinutes,
    earned,
    pf,
    net: roundMoney(earned - pf),
    hasInput,
  };
}

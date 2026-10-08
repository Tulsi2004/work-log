"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  Pencil,
  Plus,
  Timer,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/components/ui/month-picker";
import { useEmployments } from "@/hooks/use-employments";
import { usePreference } from "@/hooks/use-preference";
import { setPreference } from "@/actions/preference-actions";
import {
  CYCLE_START_DAY_PREFERENCE_KEY,
  MINUTES_PER_DAY,
  buildCycle,
  calculateSalary,
  explainDuration,
  formatDuration,
  formatMinutes,
  parseDuration,
  monthKey,
  payDateFor,
  rateForCycle,
  readCycleStartDay,
  type Cycle,
  type MinuteAdjustment,
  type SalaryCalcResult,
} from "@/lib/salary-calculator";
import { cn } from "@/lib/utils";
import { employmentLabel, formatDate, formatMoney } from "@/utils/format";
import { currentEmployment, type EmploymentWithCompany, type PayRate } from "@/types";

const thisMonth = () => {
  const today = new Date();
  return monthKey(today.getFullYear(), today.getMonth());
};

const asMonth = (date: Date | string) => {
  const value = new Date(date);
  return monthKey(value.getFullYear(), value.getMonth());
};

// A job can only be calculated over the cycles it ran. The first is the one
// closing in its starting month — or, failing a start date, its earliest rate.
function cycleBounds(employment: EmploymentWithCompany): { min: string; max: string } {
  const rates = (employment.payHistory as PayRate[] | null) ?? [];
  const earliestRate = rates.length
    ? rates.reduce(
        (first, rate) => (rate.effectiveFrom < first ? rate.effectiveFrom : first),
        rates[0].effectiveFrom
      )
    : undefined;

  const min = employment.since
    ? asMonth(employment.since)
    : earliestRate
      ? earliestRate.slice(0, 7)
      : thisMonth();

  const ended = employment.until ? asMonth(employment.until) : undefined;
  const max = ended && ended < thisMonth() ? ended : thisMonth();

  return { min, max: max < min ? min : max };
}

// Picked in the company list to type a salary instead of reading one from a pay
// history — for working out a colleague's pay, or a job that is not in the app.
const CUSTOM = "CUSTOM";

let adjustmentSeq = 0;
const newAdjustment = (): MinuteAdjustment => ({
  id: `adj-${(adjustmentSeq += 1)}`,
  label: "",
  duration: "",
  direction: "deduct",
});

export function SalaryPanel() {
  const { data: allEmployments, isLoading } = useEmployments();
  // Only the companies the calculator was switched on for.
  const employments = allEmployments?.filter((employment) => employment.company.salaryCalculator);
  const { data: storedStartDay } = usePreference(CYCLE_START_DAY_PREFERENCE_KEY);

  const [employmentId, setEmploymentId] = useState<string | undefined>(undefined);
  const [pickedMonth, setPickedMonth] = useState(thisMonth);

  const [totalHours, setTotalHours] = useState("");
  const [breakHours, setBreakHours] = useState("");
  const [avgDailyHours, setAvgDailyHours] = useState("");
  // One paid leave a month is the allowance, so that is where the field starts.
  const [paidLeaveDays, setPaidLeaveDays] = useState("1");
  const [adjustments, setAdjustments] = useState<MinuteAdjustment[]>([]);
  // Overrides, each remembered against the cycle it was typed for, so moving to
  // another cycle falls back to that cycle's own figure rather than carrying
  // one month's correction into the next.
  const [goalEdit, setGoalEdit] = useState<{ key: string; value: string } | null>(null);
  const [pfEdit, setPfEdit] = useState<{ key: string; value: string } | null>(null);

  const [salaryEdit, setSalaryEdit] = useState<{ key: string; value: number } | null>(null);
  // The custom salary is not tied to a cycle — a colleague's pay holds month to month.
  const [customSalary, setCustomSalary] = useState<number | undefined>(undefined);

  const startDay = readCycleStartDay(storedStartDay);
  const isCustom = employmentId === CUSTOM;

  // Nothing picked yet means the job you are in now — the one you are most
  // likely to be working a number out for.
  const selected = isCustom
    ? undefined
    : ((employmentId ? employments?.find((e) => e.id === employmentId) : undefined) ??
      currentEmployment(employments ?? []));

  // Switching to a job that ran over different years would leave the picker on a
  // cycle that job never had, so the choice is pulled back into its range.
  const bounds = selected ? cycleBounds(selected) : undefined;
  const month = !bounds
    ? pickedMonth
    : pickedMonth < bounds.min
      ? bounds.min
      : pickedMonth > bounds.max
        ? bounds.max
        : pickedMonth;

  const cycle = buildCycle(month, startDay);
  const cycleKey = `${isCustom ? CUSTOM : (selected?.id ?? "")}:${month}`;

  // The pay history's figure, unless one was typed over it on a card for this
  // cycle. A custom salary stands in for a pay history; its PF is typed below.
  const recorded = selected ? rateForCycle(selected.payHistory, cycle) : undefined;
  const salaryEdited = !isCustom && !!recorded && salaryEdit?.key === cycleKey;
  const rate: PayRate | undefined = isCustom
    ? { actualSalary: customSalary ?? 0, pf: 0, inHandSalary: 0, effectiveFrom: "" }
    : recorded && salaryEdit?.key === cycleKey
      ? { ...recorded, actualSalary: salaryEdit.value }
      : recorded;
  const payDate = selected ? payDateFor(cycle, selected.payDay) : undefined;
  const ratePf = rate?.pf ?? 0;
  const goalDays = goalEdit?.key === cycleKey ? goalEdit.value : String(cycle.goalDays);
  const pf = pfEdit?.key === cycleKey ? pfEdit.value : ratePf ? String(ratePf) : "";

  const result = calculateSalary(rate, {
    totalHours,
    breakHours,
    avgDailyHours,
    paidLeaveDays: Number(paidLeaveDays) || 0,
    adjustments,
    goalDays: Number(goalDays) || 0,
    pf: Number(pf) || 0,
  });

  const updateAdjustment = (id: string, patch: Partial<MinuteAdjustment>) =>
    setAdjustments((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  // Every money card writes back to the one figure the rest is worked out from:
  // a day's pay of ₹1,000 over 25 goal days is a ₹25,000 salary.
  const setSalary = (amount: number) => {
    const rounded = Math.round(amount * 100) / 100;
    if (isCustom) setCustomSalary(rounded);
    else setSalaryEdit({ key: cycleKey, value: rounded });
  };
  const saveSalaryVia = (perUnit: number) => (raw: string) => {
    const amount = readAmount(raw);
    if (amount === undefined || perUnit <= 0) return false;
    setSalary(amount * perUnit);
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3 rounded-xl border p-3">
        <div className="min-w-56 flex-1 space-y-1.5 sm:max-w-72">
          <Label className="text-xs text-muted-foreground">Company</Label>
          <Select
            value={isCustom ? CUSTOM : (selected?.id ?? "")}
            onValueChange={setEmploymentId}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a company" />
            </SelectTrigger>
            <SelectContent>
              {(employments ?? []).map((employment) => (
                <SelectItem key={employment.id} value={employment.id}>
                  {employmentLabel(employment)}
                </SelectItem>
              ))}
              {!!employments?.length && <SelectSeparator />}
              <SelectItem value={CUSTOM}>Custom — type a salary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* The picker chooses the month pay lands in; the cycle it covers reads
            underneath, because 6 Jul – 5 Aug is not obvious from "August". */}
        <div className="min-w-56 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Paid in</Label>
          <MonthPicker value={month} onChange={setPickedMonth} min={bounds?.min} max={bounds?.max} />
          <p className="text-xs text-muted-foreground">
            {cycle.label}
            {payDate && ` · paid ${formatDate(payDate)}`}
          </p>
        </div>

        <div className="flex-1" />
        <CycleStartDayField startDay={startDay} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : !selected && !isCustom ? (
        <EmptyNote>
          No companies yet — add one on the Companies page and its pay history will show up here.
        </EmptyNote>
      ) : !rate ? (
        <EmptyNote>
          No pay rate recorded for {selected?.company.name} over {cycle.label}.
        </EmptyNote>
      ) : (
        // The cards and the inputs share the left column and the ledger runs the
        // full height of the right, so every edge on the page lines up.
        <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-4">
            {/* The rate this cycle is worked out from. It is background to the
                answer, so it opens the page as cards, the way every other page does. */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Stat
                label="Actual salary"
                value={
                  isCustom && customSalary === undefined
                    ? "Click to set"
                    : formatMoney(result.actualSalary)
                }
                hint={
                  salaryEdited && recorded ? (
                    <>
                      Changed from {formatMoney(recorded.actualSalary)} ·{" "}
                      <button
                        type="button"
                        onClick={() => setSalaryEdit(null)}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        Reset
                      </button>
                    </>
                  ) : isCustom ? (
                    "Click the amount to change it"
                  ) : rate.effectiveFrom ? (
                    `From ${formatDate(rate.effectiveFrom)}`
                  ) : undefined
                }
                icon={Wallet}
                edit={{
                  initial: isCustom && customSalary === undefined ? "" : String(result.actualSalary),
                  onSave: saveSalaryVia(1),
                }}
              />
              <Stat
                label="One day"
                value={formatMoney(result.oneDaySalary)}
                hint={`÷ ${result.goalDays} goal days`}
                icon={CalendarDays}
                edit={{
                  initial: String(Math.round(result.oneDaySalary * 100) / 100),
                  onSave: saveSalaryVia(result.goalDays),
                }}
              />
              <Stat
                label="Per minute"
                value={`₹${result.perMinute.toFixed(4)}`}
                hint={`÷ ${MINUTES_PER_DAY} min a day`}
                icon={Timer}
                edit={{
                  initial: result.perMinute.toFixed(4),
                  onSave: saveSalaryVia(MINUTES_PER_DAY * result.goalDays),
                }}
              />
              {/* A full cycle is the goal days in hours, so changing it changes them. */}
              <Stat
                label="A full cycle"
                value={formatDuration(result.expectedMinutes)}
                hint={formatMinutes(result.expectedMinutes)}
                icon={Clock}
                edit={{
                  initial: formatDuration(result.expectedMinutes),
                  onSave: (raw) => {
                    if (!/^\d+(:\d{1,2})?$/.test(raw)) return false;
                    const minutes = parseDuration(raw);
                    if (minutes <= 0) return false;
                    const days = Math.round((minutes / MINUTES_PER_DAY) * 100) / 100;
                    setGoalEdit({ key: cycleKey, value: String(days) });
                    return true;
                  },
                }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Panel>
                <Section
                  title={`Hours for ${cycle.label}`}
                  hint="Straight off your attendance page. Typed as h:mm — 217:45 is 217 hours and 45 minutes."
                >
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <DurationField label="Total hours" value={totalHours} onChange={setTotalHours} />
                    <DurationField label="Break" value={breakHours} onChange={setBreakHours} sign="−" />
                  </div>
                </Section>
              </Panel>

              {/* A paid leave is never clocked, so it is paid at what a day of
                  yours averages rather than at the 8h 20m a goal day assumes. */}
              <Panel>
                <Section
                  title="Paid leave"
                  hint="Credited at your average daily hours — the portal's Avg Daily Hours for the cycle."
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                      <DurationField
                        label="Avg daily hours"
                        value={avgDailyHours}
                        onChange={setAvgDailyHours}
                      />
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Days</Label>
                        <Input
                          value={paidLeaveDays}
                          onChange={(e) => setPaidLeaveDays(e.target.value)}
                          inputMode="numeric"
                          className="w-16 text-right tabular-nums"
                        />
                      </div>
                    </div>
                    <Working>
                      {avgDailyHours.trim() &&
                        `${formatMinutes(parseDuration(avgDailyHours))} × ${Number(paidLeaveDays) || 0} = `}
                      {formatDuration(result.paidLeaveMinutes)} ={" "}
                      {formatMinutes(result.paidLeaveMinutes)} credited
                    </Working>
                  </div>
                </Section>
              </Panel>

              <Panel>
                <Section
                  title="Goal days"
                  hint={`${cycle.totalDays} days in the cycle, less ${cycle.sundays} Sundays.`}
                >
                  <div className="space-y-2">
                    <Input
                      value={goalDays}
                      onChange={(e) => setGoalEdit({ key: cycleKey, value: e.target.value })}
                      inputMode="numeric"
                      className="w-20 text-right tabular-nums"
                    />
                    <Working>
                      × {MINUTES_PER_DAY} min = {formatDuration(result.expectedMinutes)} ={" "}
                      {formatMinutes(result.expectedMinutes)} expected
                    </Working>
                  </div>
                </Section>
              </Panel>

              <Panel>
                <Section
                  title="PF"
                  hint={
                    ratePf
                      ? `${formatMoney(ratePf)} on the rate in force.`
                      : "No PF on this rate. Type one in if the cycle had any."
                  }
                >
                  <Input
                    value={pf}
                    onChange={(e) => setPfEdit({ key: cycleKey, value: e.target.value })}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-28 text-right tabular-nums"
                  />
                </Section>
              </Panel>

              <Panel className="md:col-span-2">
                <Section
                  title="Penalties and extra hours"
                  hint="A late-mark taken off, or the hours credited for a festival."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAdjustments((rows) => [...rows, newAdjustment()])}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  }
                >
                  {adjustments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing added for this cycle.</p>
                  ) : (
                    <div className="space-y-2">
                      {adjustments.map((adjustment) => (
                        <div key={adjustment.id} className="flex items-center gap-2">
                          <Input
                            value={adjustment.label}
                            onChange={(e) => updateAdjustment(adjustment.id, { label: e.target.value })}
                            placeholder="What for"
                            className="flex-1"
                          />
                          <Select
                            value={adjustment.direction}
                            onValueChange={(value) =>
                              updateAdjustment(adjustment.id, {
                                direction: value as MinuteAdjustment["direction"],
                              })
                            }
                          >
                            <SelectTrigger className="w-26">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="add">Add</SelectItem>
                              <SelectItem value="deduct">Deduct</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={adjustment.duration}
                            onChange={(e) =>
                              updateAdjustment(adjustment.id, { duration: e.target.value })
                            }
                            placeholder="h:mm"
                            inputMode="numeric"
                            className="w-20 text-right tabular-nums"
                          />
                          <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
                            {adjustment.duration.trim() &&
                              formatMinutes(parseDuration(adjustment.duration))}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setAdjustments((rows) => rows.filter((row) => row.id !== adjustment.id))
                            }
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </Panel>
            </div>
          </div>

          <Ledger result={result} cycle={cycle} />
        </div>
      )}
    </div>
  );
}

// The whole calculation in one column, top to bottom: minutes add up to a total,
// that total buys rupees, PF comes off, and the answer is at the bottom.
function Ledger({ result, cycle }: { result: SalaryCalcResult; cycle: Cycle }) {
  const difference = result.calculatedMinutes - result.expectedMinutes;

  return (
    // Stretches to the height of the left column; the minutes take up the slack,
    // so "In hand" always sits on the same bottom edge as the last input card.
    <div className="flex flex-col divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="bg-muted/40 p-4">
        <p className="text-xs text-muted-foreground">Salary for {cycle.label}</p>
        {result.hasInput ? (
          <p className="text-3xl leading-tight font-semibold tabular-nums">
            {formatMoney(result.net)}
          </p>
        ) : (
          <>
            <p className="text-3xl leading-tight font-semibold text-muted-foreground/40">—</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fill in your hours to see what lands in hand.
            </p>
          </>
        )}
      </div>

      <div className="flex-1 space-y-1 p-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Minutes</p>
        {result.minuteLines.map((line, index) => (
          <Row
            key={`${line.label}-${index}`}
            label={line.label}
            value={`${line.sign < 0 ? "−" : "+"} ${formatDuration(Math.abs(line.minutes))} · ${Math.abs(line.minutes).toLocaleString("en-IN")}`}
            muted={line.minutes === 0}
          />
        ))}
        <Row
          label="Calculated"
          value={`${formatDuration(result.calculatedMinutes)} · ${formatMinutes(result.calculatedMinutes)}`}
          strong
          className="border-t pt-1"
        />
        <Row
          label={`Against ${formatDuration(result.expectedMinutes)} expected`}
          value={`${difference > 0 ? "+" : difference < 0 ? "−" : ""} ${formatDuration(Math.abs(difference))} · ${formatMinutes(Math.abs(difference))}`}
          muted
        />
      </div>

      <div className="space-y-1 p-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Money</p>
        <Row
          label={`${result.calculatedMinutes} min × ₹${result.perMinute.toFixed(4)}`}
          value={formatMoney(result.earned)}
        />
        <Row label="PF" value={`− ${formatMoney(result.pf)}`} muted={result.pf === 0} />
        <Row
          label="In hand"
          value={result.hasInput ? formatMoney(result.net) : "—"}
          strong
          className="border-t pt-1"
        />
      </div>
    </div>
  );
}

// The cycle start day belongs to you rather than to one calculation, so it is
// kept as a preference and only has to be set once.
function CycleStartDayField({ startDay }: { startDay: number }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (value: number) => setPreference(CYCLE_START_DAY_PREFERENCE_KEY, value),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["preference", CYCLE_START_DAY_PREFERENCE_KEY] }),
    onError: (error: Error) => toast.error(error.message || "Failed to save the cycle start day"),
  });

  const value = draft ?? String(startDay);

  const commit = () => {
    const day = Number(value);
    if (Number.isInteger(day) && day >= 1 && day <= 28 && day !== startDay) save.mutate(day);
    setDraft(null);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Cycle starts on</Label>
      <Input
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        inputMode="numeric"
        className="w-16 text-right tabular-nums"
      />
    </div>
  );
}

// "₹25,000" and "25000" both read as 25000; anything else is no amount at all.
function readAmount(raw: string): number | undefined {
  const value = Number(raw.replace(/[₹,\s]/g, ""));
  return raw.trim() && Number.isFinite(value) && value >= 0 ? value : undefined;
}

// The same card the other pages open with: a label, the figure, a faint icon.
// With `edit`, clicking the figure turns it into a box: Enter or clicking away
// saves, Escape puts it back. `onSave` says whether it could read what was typed.
function Stat({
  label,
  value,
  hint,
  icon: Icon,
  edit,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: LucideIcon;
  edit?: { initial: string; onSave: (raw: string) => boolean };
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const save = () => {
    if (draft === null || !edit) return;
    const raw = draft.trim();
    setDraft(null);
    if (raw === "" || raw === edit.initial) return;
    if (!edit.onSave(raw)) toast.error(`That doesn't read as a ${label.toLowerCase()}`);
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {draft !== null ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setDraft(null);
              }}
              inputMode="decimal"
              aria-label={label}
              className="my-0.5 h-8 w-36 text-lg font-semibold tabular-nums"
            />
          ) : edit ? (
            <button
              type="button"
              onClick={() => setDraft(edit.initial)}
              title={`Click to change the ${label.toLowerCase()}`}
              className={cn(
                "group flex items-center gap-1.5 text-left leading-tight font-semibold tabular-nums",
                edit.initial === "" ? "py-1 text-base text-muted-foreground" : "text-2xl"
              )}
            >
              <span className="decoration-muted-foreground/50 decoration-dashed underline-offset-4 group-hover:underline">
                {value}
              </span>
              <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          ) : (
            <p className="text-2xl leading-tight font-semibold tabular-nums">{value}</p>
          )}
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Icon className="size-7 shrink-0 text-muted-foreground/40 sm:size-8" />
      </CardContent>
    </Card>
  );
}

// One group of inputs, in its own card.
function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Card className={className}>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
  className,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3",
        muted && "text-muted-foreground",
        strong && "font-semibold",
        className
      )}
    >
      <dt className="truncate">{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}

function DurationField({
  label,
  value,
  onChange,
  sign,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  sign?: "+" | "−";
  className?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="gap-1 text-xs text-muted-foreground">
        {label}
        {sign && <span className="tabular-nums">({sign})</span>}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="h:mm"
          inputMode="numeric"
          className={cn("w-28 text-right tabular-nums", className)}
        />
        {/* The box keeps its width, so the reading appearing beside it moves
            nothing else on the row. */}
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {explainDuration(value)}
        </span>
      </div>
    </div>
  );
}

// Arithmetic shown under a field: the same size and colour wherever it appears,
// so it reads as the working rather than as another thing to fill in.
function Working({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground tabular-nums">{children}</p>;
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

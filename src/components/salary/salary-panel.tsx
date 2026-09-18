"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
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
  formatDuration,
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

let adjustmentSeq = 0;
const newAdjustment = (): MinuteAdjustment => ({
  id: `adj-${(adjustmentSeq += 1)}`,
  label: "",
  duration: "",
  direction: "deduct",
});

export function SalaryPanel() {
  const { data: employments, isLoading } = useEmployments();
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

  const startDay = readCycleStartDay(storedStartDay);

  // Nothing picked yet means the job you are in now — the one you are most
  // likely to be working a number out for.
  const selected =
    (employmentId ? employments?.find((e) => e.id === employmentId) : undefined) ??
    currentEmployment(employments ?? []);

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
  const rate = selected ? rateForCycle(selected.payHistory, cycle) : undefined;
  const payDate = selected ? payDateFor(cycle, selected.payDay) : undefined;

  const cycleKey = `${selected?.id ?? ""}:${month}`;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border p-3">
        <div className="min-w-56 flex-1 space-y-1.5 sm:max-w-72">
          <Label className="text-xs text-muted-foreground">Company</Label>
          <Select
            value={selected?.id ?? ""}
            onValueChange={setEmploymentId}
            disabled={isLoading || !employments?.length}
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
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : !selected ? (
        <EmptyNote>
          No companies yet — add one on the Companies page and its pay history will show up here.
        </EmptyNote>
      ) : !rate ? (
        <EmptyNote>
          No pay rate recorded for {selected.company.name} over {cycle.label}.
        </EmptyNote>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5 rounded-xl border p-4">
            <Section
              title={`Hours for ${cycle.label}`}
              hint="Straight off your attendance page. Typed as h:mm — 217:45 is 217 hours and 45 minutes."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DurationField label="Total hours" value={totalHours} onChange={setTotalHours} />
                <DurationField label="Break" value={breakHours} onChange={setBreakHours} sign="−" />
              </div>
            </Section>

            <Separator />

            {/* A paid leave is never clocked, so it is paid at what a day of
                yours averages rather than at the 8h 20m a goal day assumes. */}
            <Section
              title="Paid leave"
              hint="Credited at your average daily hours — the portal's Avg Daily Hours for the cycle."
            >
              <div className="flex flex-wrap items-end gap-3">
                <DurationField
                  label="Avg daily hours"
                  value={avgDailyHours}
                  onChange={setAvgDailyHours}
                  className="w-28"
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
                <p className="pb-2 text-sm text-muted-foreground">
                  = {formatDuration(result.paidLeaveMinutes)} credited
                </p>
              </div>
            </Section>

            <Separator />

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

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <Section
                title="Goal days"
                hint={`${cycle.totalDays} days in the cycle, less ${cycle.sundays} Sundays.`}
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={goalDays}
                    onChange={(e) => setGoalEdit({ key: cycleKey, value: e.target.value })}
                    inputMode="numeric"
                    className="w-20 text-right tabular-nums"
                  />
                  <span className="text-sm text-muted-foreground">
                    = {formatDuration(result.expectedMinutes)} expected
                  </span>
                </div>
              </Section>

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
            </div>

            {/* The rate is background, not an answer — it belongs at the foot of
                the inputs rather than competing with the figure on the right. */}
            <Separator />
            <dl className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
              <Row
                label={`Actual salary${rate.effectiveFrom ? `, from ${formatDate(rate.effectiveFrom)}` : ""}`}
                value={formatMoney(result.actualSalary)}
              />
              <Row
                label={`One day, ÷ ${result.goalDays} days`}
                value={formatMoney(result.oneDaySalary)}
              />
              <Row
                label={`Per minute, ÷ ${MINUTES_PER_DAY} min`}
                value={`₹${result.perMinute.toFixed(4)}`}
              />
              <Row label="A full cycle" value={formatDuration(result.expectedMinutes)} />
            </dl>
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
    <div className="divide-y rounded-xl border lg:sticky lg:top-18">
      <div className="p-4">
        <p className="text-xs text-muted-foreground">Salary for {cycle.label}</p>
        {result.hasInput ? (
          <p className="text-3xl leading-tight font-semibold tabular-nums">
            {formatMoney(result.net)}
          </p>
        ) : (
          <p className="text-3xl leading-tight font-semibold text-muted-foreground/40">—</p>
        )}
      </div>

      <div className="space-y-1 p-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Minutes</p>
        {result.minuteLines.map((line, index) => (
          <Row
            key={`${line.label}-${index}`}
            label={line.label}
            value={`${line.sign < 0 ? "−" : "+"} ${formatDuration(Math.abs(line.minutes))}`}
            muted={line.minutes === 0}
          />
        ))}
        <Row
          label="Calculated"
          value={formatDuration(result.calculatedMinutes)}
          strong
          className="border-t pt-1"
        />
        <Row
          label={`Against ${formatDuration(result.expectedMinutes)} expected`}
          value={`${difference > 0 ? "+" : difference < 0 ? "−" : ""} ${formatDuration(Math.abs(difference))}`}
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
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="h:mm"
        inputMode="numeric"
        className={cn("text-right tabular-nums", className)}
      />
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

import { describe, expect, it } from "vitest";
import { leaveDates, monthlyWork, projectDays, workedMinutes } from "@/lib/work-time";

const day = (date: string, extra: Partial<Parameters<typeof monthlyWork>[0][number]> = {}) => ({
  date,
  isLeave: false,
  dayType: "OFFICE" as const,
  timeFrom: "09:30",
  timeTo: "18:30",
  leaveFrom: null,
  leaveTo: null,
  ...extra,
});

describe("work-time", () => {
  it("counts an overnight shift", () => {
    expect(workedMinutes("22:00", "06:00")).toBe(8 * 60);
  });

  it("buckets days, hours and a leave that crosses a month", () => {
    const rows = monthlyWork([
      day("2026-01-05"),
      day("2026-01-06", { dayType: "WORK_FROM_HOME" }),
      day("2026-01-30", { isLeave: true, leaveFrom: "2026-01-30", leaveTo: "2026-02-02", timeFrom: null, timeTo: null }),
      day("2026-03-02", { dayType: "HALF_DAY", timeFrom: "09:30", timeTo: "13:30" }),
    ]);
    expect(rows.map((r) => r.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(rows[0]).toMatchObject({ office: 1, wfh: 1, leave: 2, hours: 18 });
    expect(rows[1]).toMatchObject({ office: 0, leave: 2, hours: 0 });
    expect(rows[2]).toMatchObject({ halfDay: 1, hours: 4 });
  });

  it("counts each project once per day, most days first", () => {
    const report = (projects: string[], isLeave = false) => ({
      isLeave,
      tasks: projects.map((projectName) => ({ task: "x", projectName })),
    });
    expect(
      projectDays([
        report(["Freeserp", "freeserp ", "Bot ads"]),
        report(["Freeserp"]),
        report(["Tenon", ""]),
        report(["Tenon"], true),
      ])
    ).toEqual([
      { name: "Freeserp", days: 2 },
      { name: "Bot ads", days: 1 },
      { name: "Tenon", days: 1 },
    ]);
  });

  it("clips a leave range to the period", () => {
    const leave = day("2026-01-30", { isLeave: true, leaveFrom: "2026-01-30", leaveTo: "2026-02-02" });
    expect(leaveDates(leave, undefined, new Date("2026-01-31")).length).toBe(2);
    expect(leaveDates(day("2026-01-30", { isLeave: true })).length).toBe(1);
  });
});

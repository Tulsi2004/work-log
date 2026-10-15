import { describe, expect, it } from "vitest";
import {
  dateKey,
  formatRangeTitle,
  formatTimeRange,
  getVisibleRange,
  gmtOffsetLabel,
  navigate,
  snapToMinutes,
} from "../dates";

const d = (s: string) => new Date(`${s}T00:00:00`);
const keys = (days: Date[]) => days.map(dateKey);

describe("getVisibleRange", () => {
  it("week starting Sunday", () => {
    const r = getVisibleRange("week", d("2026-10-14"), 0, true);
    expect(dateKey(r.start)).toBe("2026-10-11");
    expect(dateKey(r.end)).toBe("2026-10-18");
    expect(r.days).toHaveLength(7);
  });

  it("week starting Monday", () => {
    const r = getVisibleRange("week", d("2026-10-14"), 1, true);
    expect(dateKey(r.start)).toBe("2026-10-12");
    expect(dateKey(r.end)).toBe("2026-10-19");
  });

  it("week across a month boundary", () => {
    const r = getVisibleRange("week", d("2026-09-30"), 0, true);
    expect(keys(r.days)[0]).toBe("2026-09-27");
    expect(keys(r.days)[6]).toBe("2026-10-03");
    expect(formatRangeTitle("week", r)).toBe("Sep – Oct 2026");
  });

  it("week across a year boundary, both week starts", () => {
    const sun = getVisibleRange("week", d("2026-12-31"), 0, true);
    expect(dateKey(sun.start)).toBe("2026-12-27");
    expect(dateKey(sun.end)).toBe("2027-01-03");
    expect(formatRangeTitle("week", sun)).toBe("Dec 2026 – Jan 2027");
    const mon = getVisibleRange("week", d("2026-12-31"), 1, true);
    expect(dateKey(mon.start)).toBe("2026-12-28");
    expect(dateKey(mon.end)).toBe("2027-01-04");
  });

  it("month view covers the full 5 or 6 week grid", () => {
    const oct = getVisibleRange("month", d("2026-10-14"), 0, true);
    expect(dateKey(oct.start)).toBe("2026-09-27");
    expect(oct.days).toHaveLength(35);
    expect(formatRangeTitle("month", oct)).toBe("October 2026");
    const aug = getVisibleRange("month", d("2026-08-10"), 0, true); // Aug 1 is a Saturday
    expect(aug.days).toHaveLength(42);
  });

  it("hides weekends", () => {
    const r = getVisibleRange("week", d("2026-10-14"), 0, false);
    expect(keys(r.days)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]);
    const four = getVisibleRange("4days", d("2026-10-16"), 0, false);
    expect(keys(four.days)).toEqual(["2026-10-16", "2026-10-19", "2026-10-20", "2026-10-21"]);
  });
});

describe("navigation and formatting", () => {
  it("navigates by view period", () => {
    const a = d("2026-10-14");
    expect(dateKey(navigate("day", a, 1))).toBe("2026-10-15");
    expect(dateKey(navigate("4days", a, -1))).toBe("2026-10-10");
    expect(dateKey(navigate("week", a, 1))).toBe("2026-10-21");
    expect(dateKey(navigate("month", a, 1))).toBe("2026-11-14");
    expect(dateKey(navigate("year", a, -1))).toBe("2025-10-14");
    expect(dateKey(navigate("schedule", a, 1))).toBe("2026-10-21");
  });

  it("formats titles, offsets and time ranges", () => {
    expect(formatRangeTitle("day", getVisibleRange("day", d("2026-10-14"), 0, true))).toBe("October 14, 2026");
    expect(gmtOffsetLabel("Asia/Kolkata")).toBe("GMT+05:30");
    const at = (h: number, m = 0) => new Date(2026, 9, 14, h, m);
    expect(formatTimeRange(at(15), at(16), "H12")).toBe("3 – 4pm");
    expect(formatTimeRange(at(9), at(10, 30), "H12", true)).toBe("9:00 – 10:30am");
    expect(formatTimeRange(at(11), at(12, 30), "H12")).toBe("11am – 12:30pm");
    expect(formatTimeRange(at(15), at(16), "H24")).toBe("15:00 – 16:00");
  });

  it("snaps to minute steps", () => {
    expect(snapToMinutes(new Date(2026, 9, 14, 9, 7), 15).getMinutes()).toBe(0);
    expect(snapToMinutes(new Date(2026, 9, 14, 9, 8), 15).getMinutes()).toBe(15);
    expect(snapToMinutes(new Date(2026, 9, 14, 9, 44), 30, "floor").getMinutes()).toBe(30);
  });
});

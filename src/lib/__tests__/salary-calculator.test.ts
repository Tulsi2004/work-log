import { describe, expect, it } from "vitest";
import { calculateSalary, type SalaryInputs } from "../salary-calculator";

const rate = { actualSalary: 35000, pf: 1200, inHandSalary: 0, effectiveFrom: "" };
const base: SalaryInputs = {
  totalHours: "",
  breakHours: "",
  avgDailyHours: "8:06",
  leavesTaken: 1,
  adjustments: [],
  goalDays: 27,
  pf: 1200,
};

describe("calculateSalary", () => {
  it("matches the portal figures with the month's leave credited", () => {
    const result = calculateSalary(rate, { ...base, totalHours: "218:33", breakHours: "3:52" });
    expect(result.calculatedMinutes).toBe(13113 - 232 + 486);
    expect(result.net).toBe(33455.19);
  });

  it("leaves taken do not move a typed portal total", () => {
    const typed = { ...base, totalHours: "218:33", breakHours: "3:52" };
    expect(calculateSalary(rate, { ...typed, leavesTaken: 0 }).net).toBe(
      calculateSalary(rate, typed).net
    );
  });

  it("estimates from goal days when the total is blank — fewer leaves, more money", () => {
    const none = calculateSalary(rate, { ...base, leavesTaken: 0 });
    const one = calculateSalary(rate, { ...base, leavesTaken: 1 });
    const three = calculateSalary(rate, { ...base, leavesTaken: 3 });

    expect(one.estimate).toEqual({ workedDays: 26, minutes: 26 * 486 });
    expect(one.calculatedMinutes).toBe(27 * 486);
    expect(none.net).toBeGreaterThan(one.net);
    expect(one.net).toBeGreaterThan(three.net);
    // Skipping the leave adds exactly one average day.
    expect(none.calculatedMinutes - one.calculatedMinutes).toBe(486);
  });
});

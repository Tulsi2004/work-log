import { describe, expect, it } from "vitest";
import { pfPassbook, pfTotals } from "@/lib/pf-passbook";

const employment = {
  payHistory: [
    { actualSalary: 10000, pf: 1200, inHandSalary: 8800, effectiveFrom: "2026-01-01" },
    { actualSalary: 10000, pf: 1200, pension: 417, inHandSalary: 8800, effectiveFrom: "2026-09-01" },
  ],
};
const paid = (date: string, emp: typeof employment | null = employment) => ({
  date,
  employmentId: "e1",
  employment: emp,
});

// Feb-2026 to Sep-2026 wages, as on the EPFO passbook for FY 2026-27.
const months = ["03", "04", "05", "06", "07", "08", "09", "10"];

describe("pfPassbook", () => {
  it("matches the EPFO passbook, the pension share included", () => {
    const rows = pfPassbook(months.map((m) => paid(`2026-${m}-10T00:00:00.000Z`)), "2026-11-05");

    expect(rows[0].wageMonth).toBe("2026-02");
    expect(rows.at(-1)).toMatchObject({ wageMonth: "2026-09", employee: 600, employer: 183, pension: 417 });
    expect(pfTotals(rows)).toEqual({ employee: 4800, employer: 4383, pension: 417, total: 9600 });
  });

  it("leaves a month out until the 15th it is due", () => {
    const salary = [paid("2026-11-10T00:00:00.000Z")];
    expect(pfPassbook(salary, "2026-11-14")).toHaveLength(0);
    expect(pfPassbook(salary, "2026-11-15")).toHaveLength(1);
  });

  it("counts two credits in one month once, and skips money with no company", () => {
    const rows = pfPassbook(
      [paid("2026-10-09T00:00:00.000Z"), paid("2026-10-20T00:00:00.000Z"), paid("2026-10-21T00:00:00.000Z", null)],
      "2026-11-05"
    );
    expect(rows).toHaveLength(1);
  });
});

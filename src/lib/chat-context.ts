import { prisma } from "@/lib/prisma";
import { BUILT_IN_PLAN_LABELS } from "@/lib/plan-labels";
import { ACCOUNT_BALANCE_PREFERENCE_KEY, readBankAccounts } from "@/lib/money-cards";
import { employmentLabel } from "@/utils/format";

// Bookkeeping columns that mean nothing to someone asking about their own week.
const NOISE = new Set(["id", "userId", "companyId", "employmentId", "createdAt", "updatedAt", "fieldId", "recordId"]);

// Compact JSON: no bookkeeping columns, no empty or false values, and plain
// dates instead of midnight timestamps — the same facts in far fewer tokens.
function compact(value: unknown): string {
  return JSON.stringify(value, (key, v) => {
    if (NOISE.has(key)) return undefined;
    if (v === null || v === "" || v === false) return undefined;
    if (Array.isArray(v) && v.length === 0) return undefined;
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(v)) return v.slice(0, 10);
    return v;
  });
}

/**
 * Everything the signed-in user has in the app, as text for the chat assistant.
 * Only ever read for `userId` — nothing here crosses accounts.
 */
// ponytail: the whole account goes into the prompt (cached for the length of a
// conversation). Fine at a few hundred records; past a few thousand, switch to
// tools that let the model query by date or company instead.
export async function loadAccountSnapshot(userId: string): Promise<string> {
  const [employments, workReports, dayPlans, planLabels, moneyEntries, customValues, balance] =
    await Promise.all([
      prisma.employment.findMany({
        where: { company: { userId } },
        include: { company: true },
        orderBy: { since: "asc" },
      }),
      prisma.workReport.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.dayPlan.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.planLabel.findMany({ where: { userId } }),
      prisma.salaryEntry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.customFieldValue.findMany({ where: { userId }, include: { field: true } }),
      prisma.userPreference.findUnique({
        where: { userId_key: { userId, key: ACCOUNT_BALANCE_PREFERENCE_KEY } },
      }),
    ]);

  const accounts = readBankAccounts(balance?.value);
  const companyOf = new Map(employments.map((e) => [e.id, employmentLabel(e)]));
  const labelName = new Map([
    ...BUILT_IN_PLAN_LABELS.map((l) => [l.id, l.name] as const),
    ...planLabels.map((l) => [l.id, l.name] as const),
  ]);
  // The user's own fields, by record: { "Client": "Acme", ... }.
  const customByRecord = new Map<string, Record<string, string>>();
  for (const { recordId, field, value } of customValues) {
    if (!value) continue;
    customByRecord.set(recordId, { ...customByRecord.get(recordId), [field.name]: value });
  }
  const withExtras = <T extends { id: string; employmentId?: string | null }>(row: T) => ({
    ...row,
    company: row.employmentId ? companyOf.get(row.employmentId) : undefined,
    yourFields: customByRecord.get(row.id),
  });

  return [
    "# Companies (each job, with its pay history)",
    compact(
      employments.map((e) => ({
        job: employmentLabel(e),
        ...e,
        company: undefined,
        ceoName: e.company.ceoName,
        jobSource: e.company.jobSource,
        shift: [e.company.defaultTimeFrom, e.company.defaultTimeTo].filter(Boolean).join("–"),
        yourFields: customByRecord.get(e.id),
      }))
    ),
    "# Work reports (one per day worked or on leave)",
    compact(workReports.map(withExtras)),
    "# Planner to-dos",
    compact(dayPlans.map((p) => ({ ...withExtras(p), label: labelName.get(p.label) ?? p.label }))),
    "# Money received, and where it went (spends)",
    compact(moneyEntries.map((m) => ({ ...withExtras(m), amount: Number(m.amount) }))),
    "# Current bank account balances (typed in by the user)",
    accounts.length ? compact(accounts) : "not set",
  ].join("\n");
}

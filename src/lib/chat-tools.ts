import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
// The SDK's tool helper is built on Zod 4, which zod 3.25 ships at this subpath.
import { z } from "zod/v4";
import type { CustomFieldEntity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SPEND_CATEGORIES, parseSpends, roundMoney, sumSpends, type SalarySpend } from "@/lib/money";
import { BUILT_IN_PLAN_LABELS, DEFAULT_PLAN_LABEL } from "@/lib/plan-labels";
import { employmentLabel, formatMoney } from "@/utils/format";
import { createSalaryEntry } from "@/actions/salary-entry-actions";
import { createDayPlan, setDayPlanDone } from "@/actions/day-plan-actions";

// The tools the chat assistant can act with. Each one only ever touches
// `userId`'s rows; creating goes through the same Server Actions the forms use,
// so the validation and rounding rules are the forms' own. Anything a tool
// throws reaches the model as an error result, and it tells the user.

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-MM-dd");
const spend = z.object({
  what: z.string().trim().min(1).max(200).describe("What the money went on, e.g. 'Groceries'"),
  amount: z.number().positive().describe("Rupees"),
  category: z.enum(SPEND_CATEGORIES),
});

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const toSpends = (spends: z.infer<typeof spend>[]): SalarySpend[] =>
  spends.map((s) => ({ what: s.what, amount: roundMoney(s.amount), category: s.category }));

// The chat cannot fill in the user's own fields, so a required one means the
// record has to be added in the app — checked first, so nothing half-saves.
async function assertNoRequiredFields(userId: string, entity: CustomFieldEntity, page: string) {
  const required = await prisma.customField.findMany({
    where: { userId, entity, required: true },
    select: { name: true },
  });
  if (required.length) {
    throw new Error(
      `Not added: this needs ${required.map((f) => f.name).join(", ")}, which can only be filled in on the ${page} page.`
    );
  }
}

// A company by the job name the assistant sees in the account data ("Acme — Developer")
// or just the company name. Several stints at one company: the latest one.
// ponytail: latest stint, not the one covering the date; pass an id if that ever matters.
async function resolveEmploymentId(userId: string, name?: string): Promise<string> {
  const wanted = name?.trim().toLowerCase();
  if (!wanted) return "";
  const jobs = await prisma.employment.findMany({
    where: { company: { userId } },
    include: { company: true },
    orderBy: { since: { sort: "desc", nulls: "last" } },
  });
  const job =
    jobs.find((j) => employmentLabel(j).toLowerCase() === wanted) ??
    jobs.find((j) => j.company.name.toLowerCase() === wanted);
  if (!job) {
    throw new Error(`No company called "${name}". The user's companies: ${jobs.map(employmentLabel).join("; ") || "none"}.`);
  }
  return job.id;
}

// A built-in label by key or name, or one of the user's own by name.
async function resolveLabel(userId: string, name?: string): Promise<string> {
  const wanted = name?.trim().toLowerCase();
  if (!wanted) return DEFAULT_PLAN_LABEL;
  const builtIn = BUILT_IN_PLAN_LABELS.find((l) => l.id.toLowerCase() === wanted || l.name.toLowerCase() === wanted);
  if (builtIn) return builtIn.id;
  const own = await prisma.planLabel.findMany({ where: { userId }, select: { id: true, name: true } });
  const match = own.find((l) => l.name.toLowerCase() === wanted);
  if (!match) {
    const names = [...BUILT_IN_PLAN_LABELS, ...own].map((l) => l.name).join(", ");
    throw new Error(`No label called "${name}". Labels: ${names}.`);
  }
  return match.id;
}

export function chatTools(userId: string) {
  return [
    betaZodTool({
      name: "add_money_entry",
      description:
        "Record money the user received (salary, bonus, freelance payment, gift...), optionally with what they did with it (spends). Returns what was saved.",
      inputSchema: z.object({
        date: day.describe("The day the money was received, yyyy-MM-dd"),
        amount: z.number().positive().describe("Rupees received"),
        source: z.string().max(200).optional().describe("Where it came from, e.g. 'Salary', 'Bonus'"),
        company: z.string().optional().describe("A job exactly as listed under Companies, or just the company name"),
        note: z.string().max(2000).optional(),
        spends: z.array(spend).optional().describe("What the money went on, if the user said"),
      }),
      run: async (input) => {
        await assertNoRequiredFields(userId, "SALARY_ENTRY", "Money");
        const employmentId = await resolveEmploymentId(userId, input.company);
        const spends = toSpends(input.spends ?? []);
        await createSalaryEntry({
          date: input.date,
          amount: String(input.amount),
          source: input.source ?? "",
          employmentId,
          note: input.note ?? "",
          spends: spends.map((s) => ({ ...s, amount: String(s.amount) })),
          customValues: {},
        });
        return `Saved: ${formatMoney(roundMoney(input.amount))} received on ${input.date}${
          input.source ? ` (${input.source})` : ""
        }${spends.length ? `, with ${formatMoney(sumSpends(spends))} of spends` : ""}.`;
      },
    }),

    betaZodTool({
      name: "add_spend",
      description:
        "Record what the user spent. In this app a spend belongs to a money entry (money received), so this adds the spends to the most recent money entry received on or before `date`. Returns which entry they went on.",
      inputSchema: z.object({
        date: day.describe("The day of the spend, yyyy-MM-dd; today if the user did not say"),
        spends: z.array(spend).min(1),
      }),
      run: async ({ date, spends }) => {
        const entry = await prisma.salaryEntry.findFirst({
          where: { userId, date: { lte: new Date(date) } },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });
        if (!entry) {
          throw new Error(`Not added: there is no money entry on or before ${date} to put spends on. The user needs to add the money they received first.`);
        }
        const all = [...parseSpends(entry.spends), ...toSpends(spends)];
        await prisma.salaryEntry.updateMany({ where: { id: entry.id, userId }, data: { spends: all } });
        const amount = Number(entry.amount);
        return `Added ${formatMoney(sumSpends(toSpends(spends)))} to the money entry of ${formatMoney(amount)} received on ${isoDay(entry.date)}${
          entry.source ? ` (${entry.source})` : ""
        }. That entry now accounts for ${formatMoney(sumSpends(all))} of ${formatMoney(amount)}.`;
      },
    }),

    betaZodTool({
      name: "add_todo",
      description: "Add a to-do to the user's planner.",
      inputSchema: z.object({
        date: day.describe("The day it is planned for, yyyy-MM-dd"),
        title: z.string().trim().min(1).max(300),
        detail: z.string().max(2000).optional(),
        label: z
          .string()
          .optional()
          .describe(`A label name: ${BUILT_IN_PLAN_LABELS.map((l) => l.name).join(", ")}, or one of the user's own. Default General.`),
        company: z.string().optional().describe("A job exactly as listed under Companies, or just the company name"),
      }),
      run: async (input) => {
        await assertNoRequiredFields(userId, "DAY_PLAN", "Planner");
        const [employmentId, label] = await Promise.all([
          resolveEmploymentId(userId, input.company),
          resolveLabel(userId, input.label),
        ]);
        await createDayPlan({
          date: input.date,
          title: input.title,
          detail: input.detail ?? "",
          label,
          employmentId,
          isDone: false,
          customValues: {},
        });
        return `Added to-do "${input.title}" on ${input.date}.`;
      },
    }),

    betaZodTool({
      name: "complete_todo",
      description:
        "Mark one of the user's open planner to-dos as done, found by its title (and date, when given). If several match, returns them so you can ask which one.",
      inputSchema: z.object({
        title: z.string().trim().min(1).describe("The to-do's title, or a distinctive part of it"),
        date: day.optional().describe("The day it is planned for, yyyy-MM-dd, if known"),
      }),
      run: async ({ title, date }) => {
        const open = await prisma.dayPlan.findMany({
          where: {
            userId,
            isDone: false,
            title: { contains: title, mode: "insensitive" },
            ...(date ? { date: new Date(date) } : {}),
          },
          orderBy: { date: "asc" },
          take: 10,
          select: { id: true, title: true, date: true },
        });
        const exact = open.filter((p) => p.title.toLowerCase() === title.toLowerCase());
        const matches = exact.length ? exact : open;
        if (matches.length === 0) {
          throw new Error(`No open to-do matching "${title}"${date ? ` on ${date}` : ""}.`);
        }
        if (matches.length > 1) {
          const list = matches.map((p) => `"${p.title}" on ${isoDay(p.date)}`).join("; ");
          throw new Error(`Nothing marked done: several open to-dos match — ask the user which one. ${list}`);
        }
        await setDayPlanDone(matches[0].id, true);
        return `Marked done: "${matches[0].title}" on ${isoDay(matches[0].date)}.`;
      },
    }),
  ];
}

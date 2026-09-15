"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { salaryEntrySchema, type SalaryEntryInput } from "@/lib/validations/salary-entry";
import { saveCustomValues, deleteCustomValues } from "@/lib/custom-field-store";
import { roundMoney } from "@/lib/money";
import type { SalarySpend } from "@/types";

// A company is optional on a money entry, but when one is given it has to be
// the user's own — the client only ever sends the id.
async function resolveEmploymentId(userId: string, employmentId?: string): Promise<string | null> {
  if (!employmentId) return null;
  const employment = await prisma.employment.findFirst({
    where: { id: employmentId, company: { userId } },
    select: { id: true },
  });
  if (!employment) {
    throw new Error("Company not found");
  }
  return employment.id;
}

// Rows the user left blank are dropped rather than stored, so an entry with no
// spends yet costs nothing and reads as "nothing spent".
function toSpends(input: SalaryEntryInput["spends"]): SalarySpend[] {
  return input
    .filter((spend) => spend.what.trim() && (spend.amount ?? "").trim())
    .map((spend) => ({
      what: spend.what.trim(),
      amount: roundMoney(Number(spend.amount)),
      category: spend.category,
    }));
}

function toSalaryEntryData(data: SalaryEntryInput, employmentId: string | null) {
  return {
    date: new Date(data.date),
    amount: roundMoney(Number(data.amount)),
    source: data.source?.trim() || null,
    note: data.note?.trim() || null,
    spends: toSpends(data.spends),
    employmentId,
  };
}

export async function createSalaryEntry(input: SalaryEntryInput) {
  const userId = await requireUserId();
  const data = salaryEntrySchema.parse(input);
  const employmentId = await resolveEmploymentId(userId, data.employmentId);

  const entry = await prisma.salaryEntry.create({
    data: { ...toSalaryEntryData(data, employmentId), userId },
    select: { id: true },
  });

  await saveCustomValues(prisma, userId, "SALARY_ENTRY", entry.id, data.customValues);

  revalidatePath("/money");
  // Only the id goes back: `amount` is a Decimal, which a Server Action cannot
  // serialize to the client.
  return { id: entry.id };
}

export async function updateSalaryEntry(id: string, input: SalaryEntryInput) {
  const userId = await requireUserId();
  const data = salaryEntrySchema.parse(input);
  const employmentId = await resolveEmploymentId(userId, data.employmentId);

  const result = await prisma.salaryEntry.updateMany({
    where: { id, userId },
    data: toSalaryEntryData(data, employmentId),
  });

  if (result.count === 0) {
    throw new Error("Money entry not found");
  }

  await saveCustomValues(prisma, userId, "SALARY_ENTRY", id, data.customValues);

  revalidatePath("/money");
  return { id };
}

export async function deleteSalaryEntry(id: string) {
  const userId = await requireUserId();

  const result = await prisma.salaryEntry.deleteMany({ where: { id, userId } });

  if (result.count === 0) {
    throw new Error("Money entry not found");
  }

  await deleteCustomValues(prisma, userId, [id]);

  revalidatePath("/money");
}

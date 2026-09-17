"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { dayPlanSchema, type DayPlanInput } from "@/lib/validations/day-plan";
import { isBuiltInPlanLabel } from "@/lib/plan-labels";
import { saveCustomValues, deleteCustomValues } from "@/lib/custom-field-store";

// Built-in labels are keys everyone shares; anything else has to be a label
// this user defined, not an id borrowed from someone else.
async function requireLabel(userId: string, label: string): Promise<string> {
  if (isBuiltInPlanLabel(label)) return label;
  const own = await prisma.planLabel.findFirst({ where: { id: label, userId }, select: { id: true } });
  if (!own) {
    throw new Error("Label not found");
  }
  return own.id;
}

// An employment is optional on a plan, but when one is given it has to be the user's own.
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

function toDayPlanData(data: DayPlanInput, employmentId: string | null, label: string) {
  return {
    date: new Date(data.date),
    title: data.title.trim(),
    detail: data.detail?.trim() || null,
    label,
    isDone: data.isDone,
    employmentId,
  };
}

export async function createDayPlan(input: DayPlanInput) {
  const userId = await requireUserId();
  const data = dayPlanSchema.parse(input);
  const employmentId = await resolveEmploymentId(userId, data.employmentId);
  const label = await requireLabel(userId, data.label);

  const plan = await prisma.dayPlan.create({
    data: { ...toDayPlanData(data, employmentId, label), userId },
  });

  await saveCustomValues(prisma, userId, "DAY_PLAN", plan.id, data.customValues);

  revalidatePath("/planner");
  return plan;
}

export async function updateDayPlan(id: string, input: DayPlanInput) {
  const userId = await requireUserId();
  const data = dayPlanSchema.parse(input);
  const employmentId = await resolveEmploymentId(userId, data.employmentId);
  const label = await requireLabel(userId, data.label);

  const result = await prisma.dayPlan.updateMany({
    where: { id, userId },
    data: toDayPlanData(data, employmentId, label),
  });

  if (result.count === 0) {
    throw new Error("To-do not found");
  }

  await saveCustomValues(prisma, userId, "DAY_PLAN", id, data.customValues);

  revalidatePath("/planner");
  return { id };
}

export async function setDayPlanDone(id: string, isDone: boolean) {
  const userId = await requireUserId();

  const result = await prisma.dayPlan.updateMany({
    where: { id, userId },
    data: { isDone },
  });

  if (result.count === 0) {
    throw new Error("To-do not found");
  }

  revalidatePath("/planner");
  return { id, isDone };
}

export async function deleteDayPlan(id: string) {
  const userId = await requireUserId();

  const result = await prisma.dayPlan.deleteMany({ where: { id, userId } });

  if (result.count === 0) {
    throw new Error("To-do not found");
  }

  await deleteCustomValues(prisma, userId, [id]);

  revalidatePath("/planner");
}

// Clears the ticked-off to-dos the planner is currently showing.
export async function deleteDayPlans(ids: string[]) {
  const userId = await requireUserId();
  if (ids.length === 0) return { count: 0 };

  const result = await prisma.dayPlan.deleteMany({ where: { id: { in: ids }, userId } });
  await deleteCustomValues(prisma, userId, ids);

  revalidatePath("/planner");
  return { count: result.count };
}

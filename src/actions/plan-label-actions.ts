"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { DEFAULT_PLAN_LABEL, isBuiltInPlanLabel } from "@/lib/plan-labels";
import { planLabelSchema, type PlanLabelInput } from "@/lib/validations/plan-label";

export async function listPlanLabels() {
  const userId = await requireUserId();
  return prisma.planLabel.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

function duplicateNameError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createPlanLabel(input: PlanLabelInput) {
  const userId = await requireUserId();
  const data = planLabelSchema.parse(input);
  const name = data.name.trim();

  if (isBuiltInPlanLabel(name.toUpperCase().replace(/[\s-]+/g, "_"))) {
    throw new Error(`"${name}" is already one of the built-in labels`);
  }

  const last = await prisma.planLabel.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    const label = await prisma.planLabel.create({
      data: { userId, name, colour: data.colour, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
    revalidatePath("/planner");
    return label;
  } catch (error) {
    if (duplicateNameError(error)) {
      throw new Error(`You already have a label called "${name}"`);
    }
    throw error;
  }
}

export async function updatePlanLabel(id: string, input: PlanLabelInput) {
  const userId = await requireUserId();
  const data = planLabelSchema.parse(input);
  const name = data.name.trim();

  try {
    const result = await prisma.planLabel.updateMany({
      where: { id, userId },
      data: { name, colour: data.colour },
    });
    if (result.count === 0) {
      throw new Error("Label not found");
    }
  } catch (error) {
    if (duplicateNameError(error)) {
      throw new Error(`You already have a label called "${name}"`);
    }
    throw error;
  }

  revalidatePath("/planner");
  return { id };
}

export async function deletePlanLabel(id: string) {
  const userId = await requireUserId();

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.planLabel.deleteMany({ where: { id, userId } });
    if (deleted.count === 0) return deleted;
    // To-dos wearing the label are kept; they fall back to the default one.
    await tx.dayPlan.updateMany({ where: { userId, label: id }, data: { label: DEFAULT_PLAN_LABEL } });
    return deleted;
  });

  if (result.count === 0) {
    throw new Error("Label not found");
  }

  revalidatePath("/planner");
}

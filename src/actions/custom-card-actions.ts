"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { computeCustomCards } from "@/lib/custom-card-values";
import { customCardSchema, type CustomCardInput } from "@/lib/validations/custom-card";
import type { CustomCardValue } from "@/lib/custom-cards";

function order(): { sortOrder: "asc" }[] {
  return [{ sortOrder: "asc" }];
}

/** Every card the user built, with the number each one currently works out to. */
export async function listCustomCards(): Promise<CustomCardValue[]> {
  const userId = await requireUserId();
  const cards = await prisma.customCard.findMany({
    where: { userId },
    orderBy: [...order(), { createdAt: "asc" }],
  });
  return computeCustomCards(userId, cards);
}

function toCardData(data: CustomCardInput) {
  return {
    title: data.title.trim(),
    source: data.source,
    measure: data.measure,
    // A count measures nothing in particular, so it stores no field.
    field: data.measure === "count" ? null : data.field || null,
    period: data.period,
    filters: data.filters.filter((filter) => filter.field && filter.value),
  };
}

export async function createCustomCard(input: CustomCardInput) {
  const userId = await requireUserId();
  const data = customCardSchema.parse(input);

  const last = await prisma.customCard.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const card = await prisma.customCard.create({
    data: { ...toCardData(data), userId, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });

  revalidatePath("/");
  return card;
}

export async function updateCustomCard(id: string, input: CustomCardInput) {
  const userId = await requireUserId();
  const data = customCardSchema.parse(input);

  const result = await prisma.customCard.updateMany({ where: { id, userId }, data: toCardData(data) });
  if (result.count === 0) {
    throw new Error("Card not found");
  }

  revalidatePath("/");
  return { id };
}

export async function deleteCustomCard(id: string) {
  const userId = await requireUserId();

  const result = await prisma.customCard.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    throw new Error("Card not found");
  }

  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import type { CustomFieldEntity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { customFieldSchema, type CustomFieldInput } from "@/lib/validations/custom-field";

export async function listCustomFields(entity?: CustomFieldEntity) {
  const userId = await requireUserId();
  return prisma.customField.findMany({
    where: { userId, ...(entity ? { entity } : {}) },
    orderBy: [{ entity: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

function toCustomFieldData(data: CustomFieldInput) {
  // Always a Json array, never null: clearing a nullable Json column needs
  // Prisma.DbNull, which is matched by object identity and breaks if the bundler
  // hands this module a second copy of @prisma/client. An empty array says the
  // same thing, and `selectOptions()` already reads it as "no choices".
  const options = data.type === "SELECT"
    ? data.options.map((option) => option.value.trim()).filter(Boolean)
    : [];

  return {
    entity: data.entity,
    name: data.name.trim(),
    type: data.type,
    options,
    required: data.required,
  };
}

function duplicateNameError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createCustomField(input: CustomFieldInput) {
  const userId = await requireUserId();
  const data = customFieldSchema.parse(input);

  const lastField = await prisma.customField.findFirst({
    where: { userId, entity: data.entity },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    const field = await prisma.customField.create({
      data: { ...toCustomFieldData(data), userId, sortOrder: (lastField?.sortOrder ?? -1) + 1 },
    });
    revalidatePath("/settings");
    return field;
  } catch (error) {
    if (duplicateNameError(error)) {
      throw new Error(`You already have a field called "${data.name.trim()}" here`);
    }
    throw error;
  }
}

export async function updateCustomField(id: string, input: CustomFieldInput) {
  const userId = await requireUserId();
  const data = customFieldSchema.parse(input);

  const existing = await prisma.customField.findFirst({ where: { id, userId }, select: { type: true } });
  if (!existing) {
    throw new Error("Field not found");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.customField.updateMany({ where: { id, userId }, data: toCustomFieldData(data) });
      // A type change would leave values that no longer parse (a date in a
      // number field, say), so clear them rather than render something broken.
      if (existing.type !== data.type) {
        await tx.customFieldValue.deleteMany({ where: { fieldId: id } });
      }
    });
  } catch (error) {
    if (duplicateNameError(error)) {
      throw new Error(`You already have a field called "${data.name.trim()}" here`);
    }
    throw error;
  }

  revalidatePath("/settings");
  return { id };
}

export async function deleteCustomField(id: string) {
  const userId = await requireUserId();

  // Values cascade with the definition.
  const result = await prisma.customField.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    throw new Error("Field not found");
  }

  revalidatePath("/settings");
}


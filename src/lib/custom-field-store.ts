import "server-only";

import type { CustomField, CustomFieldEntity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CustomValues } from "@/lib/custom-fields";

type Client = Prisma.TransactionClient | typeof prisma;

export function listFieldsForEntity(userId: string, entity: CustomFieldEntity): Promise<CustomField[]> {
  return prisma.customField.findMany({
    where: { userId, entity },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

// Writes the record's values for the user's own fields of that entity. Anything
// left blank is deleted rather than stored, so an unused field costs no rows.
// Field ids the user does not own are ignored — they never reach the database.
export async function saveCustomValues(
  client: Client,
  userId: string,
  entity: CustomFieldEntity,
  recordId: string,
  values: CustomValues | undefined
) {
  const fields = await client.customField.findMany({
    where: { userId, entity },
    select: { id: true, name: true, required: true },
  });
  if (fields.length === 0) return;

  for (const field of fields) {
    const value = values?.[field.id]?.trim() ?? "";
    if (!value) {
      // A resolver-backed form ignores react-hook-form rules, so "required" on a
      // user-defined field is enforced here, where every entity passes through.
      if (field.required) {
        throw new Error(`${field.name} is required`);
      }
      await client.customFieldValue.deleteMany({ where: { fieldId: field.id, recordId } });
      continue;
    }
    await client.customFieldValue.upsert({
      where: { fieldId_recordId: { fieldId: field.id, recordId } },
      create: { fieldId: field.id, userId, recordId, value },
      update: { value },
    });
  }
}

// recordId is a loose reference, so deleting a record has to clear its values.
export async function deleteCustomValues(client: Client, userId: string, recordIds: string[]) {
  if (recordIds.length === 0) return;
  await client.customFieldValue.deleteMany({ where: { userId, recordId: { in: recordIds } } });
}

export async function loadCustomValues(
  userId: string,
  recordIds: string[]
): Promise<Record<string, CustomValues>> {
  if (recordIds.length === 0) return {};
  const rows = await prisma.customFieldValue.findMany({
    where: { userId, recordId: { in: recordIds } },
    select: { recordId: true, fieldId: true, value: true },
  });

  const byRecord: Record<string, CustomValues> = {};
  for (const row of rows) {
    (byRecord[row.recordId] ??= {})[row.fieldId] = row.value ?? "";
  }
  return byRecord;
}

export function attachCustomValues<T extends { id: string }>(
  records: T[],
  byRecord: Record<string, CustomValues>
): (T & { customValues: CustomValues })[] {
  return records.map((record) => ({ ...record, customValues: byRecord[record.id] ?? {} }));
}

// Narrows a set of records to those matching `fieldId -> value` filters.
// TEXT-ish fields match on "contains"; everything else on an exact value.
export async function recordIdsMatchingFilters(
  userId: string,
  entity: CustomFieldEntity,
  filters: { fieldId: string; value: string }[]
): Promise<string[] | undefined> {
  if (filters.length === 0) return undefined;

  const fields = await prisma.customField.findMany({
    where: { userId, entity, id: { in: filters.map((f) => f.fieldId) } },
    select: { id: true, type: true },
  });
  const typeById = new Map(fields.map((field) => [field.id, field.type]));

  let matched: Set<string> | undefined;
  for (const filter of filters) {
    const type = typeById.get(filter.fieldId);
    // A filter on a field the user does not own matches nothing.
    if (!type) return [];

    const rows = await prisma.customFieldValue.findMany({
      where: {
        userId,
        fieldId: filter.fieldId,
        value:
          type === "TEXT" || type === "LONG_TEXT"
            ? { contains: filter.value, mode: "insensitive" }
            : filter.value,
      },
      select: { recordId: true },
    });

    const ids = new Set(rows.map((row) => row.recordId));
    matched = matched ? new Set([...matched].filter((id) => ids.has(id))) : ids;
    if (matched.size === 0) return [];
  }

  return [...(matched ?? [])];
}

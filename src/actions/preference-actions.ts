"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function getPreference(key: string) {
  const userId = await requireUserId();
  const row = await prisma.userPreference.findUnique({
    where: { userId_key: { userId, key } },
    select: { value: true },
  });
  return row?.value ?? null;
}

export async function setPreference(key: string, value: unknown) {
  const userId = await requireUserId();
  await prisma.userPreference.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value: value as never },
    update: { value: value as never },
  });
  return { key };
}

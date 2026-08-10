"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function getDashboardStats() {
  const userId = await requireUserId();

  const [totalNotes, recentNotes] = await Promise.all([
    prisma.note.count({ where: { userId } }),
    prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return { totalNotes, recentNotes };
}

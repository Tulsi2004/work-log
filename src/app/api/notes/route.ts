import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type { Prisma, NoteCategory } from "@prisma/client";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const category = request.nextUrl.searchParams.get("category")?.trim() ?? "";

  const where: Prisma.NoteWhereInput = {
    userId,
    ...(category ? { category: category as NoteCategory } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const notes = await prisma.note.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ data: notes });
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { noteSchema, type NoteInput } from "@/lib/validations/note";

export async function createNote(input: NoteInput) {
  const userId = await requireUserId();
  const data = noteSchema.parse(input);

  const note = await prisma.note.create({
    data: { ...data, title: data.title || null, userId },
  });

  revalidatePath("/notes");
  return note;
}

export async function updateNote(id: string, input: NoteInput) {
  const userId = await requireUserId();
  const data = noteSchema.parse(input);

  const result = await prisma.note.updateMany({
    where: { id, userId },
    data: { ...data, title: data.title || null },
  });

  if (result.count === 0) {
    throw new Error("Note not found");
  }

  revalidatePath("/notes");
  return { id };
}

export async function deleteNote(id: string) {
  const userId = await requireUserId();

  const result = await prisma.note.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) {
    throw new Error("Note not found");
  }

  revalidatePath("/notes");
}

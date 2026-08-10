"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { noteSchema, type NoteInput } from "@/lib/validations/note";

// Only persists the field group belonging to the selected category — switching
// a note's category clears out whatever the previous category had filled in.
function toNoteData(data: NoteInput) {
  const { category } = data;

  return {
    title: data.title || null,
    content: data.content || null,
    category,

    attendanceStatus: category === "ATTENDANCE" ? (data.attendanceStatus ?? null) : null,
    checkIn: category === "ATTENDANCE" ? data.checkIn || null : null,
    checkOut: category === "ATTENDANCE" ? data.checkOut || null : null,
    breakIn: category === "ATTENDANCE" ? data.breakIn || null : null,
    breakOut: category === "ATTENDANCE" ? data.breakOut || null : null,

    companyName: category === "COMPANY" ? data.companyName || null : null,
    companyStatus: category === "COMPANY" ? (data.companyStatus ?? null) : null,

    projectName: category === "PROJECT" ? data.projectName || null : null,
    projectStatus: category === "PROJECT" ? (data.projectStatus ?? null) : null,
    projectStartDate: category === "PROJECT" && data.projectStartDate ? new Date(data.projectStartDate) : null,
    projectEndDate: category === "PROJECT" && data.projectEndDate ? new Date(data.projectEndDate) : null,

    workLogDate: category === "WORK_LOG" && data.workLogDate ? new Date(data.workLogDate) : null,
    hoursWorked: category === "WORK_LOG" && data.hoursWorked ? Number(data.hoursWorked) : null,
    workLogStatus: category === "WORK_LOG" ? (data.workLogStatus ?? null) : null,
  };
}

export async function createNote(input: NoteInput) {
  const userId = await requireUserId();
  const data = noteSchema.parse(input);

  const note = await prisma.note.create({
    data: { ...toNoteData(data), userId },
  });

  revalidatePath("/notes");
  return note;
}

export async function updateNote(id: string, input: NoteInput) {
  const userId = await requireUserId();
  const data = noteSchema.parse(input);

  const result = await prisma.note.updateMany({
    where: { id, userId },
    data: toNoteData(data),
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

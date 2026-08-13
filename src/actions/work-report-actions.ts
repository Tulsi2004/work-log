"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { employmentSchema, workReportSchema, type EmploymentInput, type WorkReportInput } from "@/lib/validations/work-report";

export async function listEmployments() {
  const userId = await requireUserId();
  return prisma.employment.findMany({
    where: { company: { userId } },
    include: { company: true },
    orderBy: [{ company: { name: "asc" } }, { since: "desc" }],
  });
}

async function findOrCreateCompany(userId: string, name: string) {
  const existing = await prisma.company.findFirst({ where: { userId, name } });
  if (existing) return existing;
  return prisma.company.create({ data: { userId, name } });
}

function toEmploymentData(data: EmploymentInput) {
  const payHistory = [...data.payHistory]
    .map((entry) => ({ amount: Number(entry.amount), effectiveFrom: entry.effectiveFrom }))
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  return {
    designation: data.designation || null,
    since: data.since ? new Date(data.since) : null,
    until: data.until ? new Date(data.until) : null,
    paymentType: data.paymentType,
    payHistory,
  };
}

export async function createEmployment(input: EmploymentInput) {
  const userId = await requireUserId();
  const data = employmentSchema.parse(input);

  const company = await findOrCreateCompany(userId, data.companyName);

  const employment = await prisma.employment.create({
    data: { ...toEmploymentData(data), companyId: company.id },
    include: { company: true },
  });

  revalidatePath("/work-reports");
  return employment;
}

export async function updateEmployment(id: string, input: EmploymentInput) {
  const userId = await requireUserId();
  const data = employmentSchema.parse(input);

  const existing = await prisma.employment.findFirst({ where: { id, company: { userId } } });
  if (!existing) {
    throw new Error("Employment not found");
  }

  const company = await findOrCreateCompany(userId, data.companyName);

  const result = await prisma.employment.updateMany({
    where: { id, company: { userId } },
    data: { ...toEmploymentData(data), companyId: company.id },
  });

  if (result.count === 0) {
    throw new Error("Employment not found");
  }

  revalidatePath("/work-reports");
  return { id };
}

export async function deleteEmployment(id: string) {
  const userId = await requireUserId();

  const result = await prisma.employment.deleteMany({
    where: { id, company: { userId } },
  });

  if (result.count === 0) {
    throw new Error("Company not found");
  }

  revalidatePath("/work-reports");
}

function toWorkReportData(data: WorkReportInput) {
  return {
    employmentId: data.employmentId,
    date: new Date(data.date),
    timeFrom: data.timeFrom || null,
    timeTo: data.timeTo || null,
    dayType: data.dayType,

    isLeave: data.isLeave,
    leaveFrom: data.isLeave && data.leaveFrom ? new Date(data.leaveFrom) : null,
    leaveTo: data.isLeave && data.leaveTo ? new Date(data.leaveTo) : null,
    hasMeeting: data.isLeave ? data.hasMeeting : false,
    leaveReason: data.isLeave ? data.leaveReason || null : null,

    hasNoTask: data.hasNoTask,
    noTaskNote: data.hasNoTask ? data.noTaskNote || null : null,
    tasks: data.hasNoTask ? [] : data.tasks,

    notes: data.notes || null,
  };
}

export async function createWorkReport(input: WorkReportInput) {
  const userId = await requireUserId();
  const data = workReportSchema.parse(input);

  const employment = await prisma.employment.findFirst({ where: { id: data.employmentId, company: { userId } } });
  if (!employment) {
    throw new Error("Company not found");
  }

  const report = await prisma.workReport.create({
    data: { ...toWorkReportData(data), userId },
  });

  revalidatePath("/work-reports");
  return report;
}

export async function updateWorkReport(id: string, input: WorkReportInput) {
  const userId = await requireUserId();
  const data = workReportSchema.parse(input);

  const employment = await prisma.employment.findFirst({ where: { id: data.employmentId, company: { userId } } });
  if (!employment) {
    throw new Error("Company not found");
  }

  const result = await prisma.workReport.updateMany({
    where: { id, userId },
    data: toWorkReportData(data),
  });

  if (result.count === 0) {
    throw new Error("Work report not found");
  }

  revalidatePath("/work-reports");
  return { id };
}

export async function deleteWorkReport(id: string) {
  const userId = await requireUserId();

  const result = await prisma.workReport.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) {
    throw new Error("Work report not found");
  }

  revalidatePath("/work-reports");
}

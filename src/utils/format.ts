import { format, differenceInMonths } from "date-fns";
import type { EmploymentWithCompany } from "@/types";

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatDay(date: Date | string): string {
  return format(new Date(date), "EEEE");
}

export function formatTime(time?: string | null): string | undefined {
  if (!time) return undefined;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, "h:mm a");
}

const ENUM_LABELS: Record<string, string> = {
  LUMPSUM: "Lump sum",
  MONTHLY: "Monthly",

  OFFICE: "Office",
  WORK_FROM_HOME: "Work From Home",
  HALF_DAY: "Half Day",

  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
};

export function formatEnumLabel(value: string): string {
  return ENUM_LABELS[value] ?? value;
}

// Total time served in a stint, from `since` up to `until` (or today if ongoing).
export function formatTenure(since?: Date | string | null, until?: Date | string | null): string | undefined {
  if (!since) return undefined;
  const start = new Date(since);
  const end = until ? new Date(until) : new Date();
  const months = differenceInMonths(end, start);
  if (months < 0) return undefined;
  if (months < 1) return "< 1 mo";
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const parts: string[] = [];
  if (years) parts.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
  if (restMonths) parts.push(`${restMonths} ${restMonths === 1 ? "mo" : "mos"}`);
  return parts.join(" ");
}

export function employmentLabel(e: EmploymentWithCompany): string {
  return e.designation ? `${e.company.name} — ${e.designation}` : e.company.name;
}

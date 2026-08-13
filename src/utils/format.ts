import { format } from "date-fns";

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatDay(date: Date | string): string {
  return format(new Date(date), "EEEE");
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

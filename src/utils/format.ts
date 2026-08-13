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

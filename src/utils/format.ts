import { format } from "date-fns";

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

const NOTE_CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General",
  WORK: "Work",
  PERSONAL: "Personal",
  IDEAS: "Ideas",
  REFERENCE: "Reference",
  ATTENDANCE: "Attendance",
  COMPANY: "Company",
  PROJECT: "Project",
  WORK_LOG: "Work Log",
};

export function formatEnumLabel(value: string): string {
  return NOTE_CATEGORY_LABELS[value] ?? value;
}

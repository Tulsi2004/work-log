import { format } from "date-fns";

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

const ENUM_LABELS: Record<string, string> = {
  GENERAL: "General",
  WORK: "Work",
  PERSONAL: "Personal",
  IDEAS: "Ideas",
  REFERENCE: "Reference",
  ATTENDANCE: "Attendance",
  COMPANY: "Company",
  PROJECT: "Project",
  WORK_LOG: "Work Log",

  PRESENT: "Present",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
  HOLIDAY: "Holiday",
  WORK_FROM_HOME: "Work From Home",

  ACTIVE: "Active",
  INACTIVE: "Inactive",

  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
};

export function formatEnumLabel(value: string): string {
  return ENUM_LABELS[value] ?? value;
}

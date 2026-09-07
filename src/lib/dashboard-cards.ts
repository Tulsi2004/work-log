// Every card the dashboard can show. The user picks which of these appear and in
// what order; `DEFAULT_DASHBOARD_CARDS` is what a fresh account sees, and matches
// the four cards the strip had before it was customisable.

export const DASHBOARD_CARD_IDS = [
  // Across every company
  "totalWorkReports",
  "totalCompanies",
  "experienceMonths",
  "openTodos",
  "doneTodos",
  // The company selected above
  "employmentWorkReports",
  "employmentTenure",
  "employmentInHand",
  "employmentActual",
  "officeDays",
  "wfhDays",
  "halfDays",
  "leaveDays",
  "companyGrantedLeaveDays",
  "meetings",
  "noTaskDays",
  "reportsThisMonth",
] as const;

export type DashboardCardId = (typeof DASHBOARD_CARD_IDS)[number];

export interface DashboardCardMeta {
  label: string;
  /** True when the number only covers the company selected in the header. */
  scopedToCompany: boolean;
}

export const DASHBOARD_CARD_META: Record<DashboardCardId, DashboardCardMeta> = {
  totalWorkReports: { label: "Total work reports", scopedToCompany: false },
  totalCompanies: { label: "Companies", scopedToCompany: false },
  experienceMonths: { label: "Total experience", scopedToCompany: false },
  openTodos: { label: "Open to-dos", scopedToCompany: false },
  doneTodos: { label: "Done to-dos", scopedToCompany: false },

  employmentWorkReports: { label: "Reports at this company", scopedToCompany: true },
  employmentTenure: { label: "Time at this company", scopedToCompany: true },
  employmentInHand: { label: "In-hand salary", scopedToCompany: true },
  employmentActual: { label: "Actual salary", scopedToCompany: true },
  officeDays: { label: "Office days", scopedToCompany: true },
  wfhDays: { label: "Work from home days", scopedToCompany: true },
  halfDays: { label: "Half days", scopedToCompany: true },
  leaveDays: { label: "Leave days", scopedToCompany: true },
  companyGrantedLeaveDays: { label: "Company-granted leaves", scopedToCompany: true },
  meetings: { label: "Meetings", scopedToCompany: true },
  noTaskDays: { label: "No-task days", scopedToCompany: true },
  reportsThisMonth: { label: "Reports this month", scopedToCompany: true },
};

export const DEFAULT_DASHBOARD_CARDS: DashboardCardId[] = [
  "totalWorkReports",
  "totalCompanies",
  "employmentWorkReports",
  "experienceMonths",
];

export const DASHBOARD_CARDS_PREFERENCE_KEY = "dashboardCards";

/** Drops ids that no longer exist and de-duplicates, so a stale preference still renders. */
export function readDashboardCards(value: unknown): DashboardCardId[] {
  // No stored preference yet — show the original four.
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_CARDS;

  const known = new Set<string>(DASHBOARD_CARD_IDS);
  const cards: DashboardCardId[] = [];
  for (const id of value) {
    if (typeof id !== "string" || !known.has(id)) continue;
    if (cards.includes(id as DashboardCardId)) continue;
    cards.push(id as DashboardCardId);
  }
  // An empty array is a real choice (every card hidden), so it is kept as-is.
  return cards;
}

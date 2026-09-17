import type { CardOption } from "@/lib/card-preferences";
import { readCards } from "@/lib/card-preferences";

// Every number the companies page can put on a card. They all answer to the
// filters in force, so narrowing to "Past" gives the figures for past jobs.
//
// The ids are what a saved card layout stores, so they keep the old wording
// ("stint") even though the labels below read "job".
export const COMPANY_CARD_IDS = [
  "companies",
  "stints",
  "currentStints",
  "experienceMonths",
  "currentInHand",
  "currentActual",
  "highestInHand",
  "hikes",
  "longestStint",
  "lastHike",
] as const;

export type CompanyCardId = (typeof COMPANY_CARD_IDS)[number];

export const COMPANY_CARD_META: Record<CompanyCardId, CardOption> = {
  companies: { label: "Companies" },
  stints: { label: "Jobs", badge: "Rejoins count twice" },
  currentStints: { label: "Currently working" },
  experienceMonths: { label: "Total experience", badge: "Overlaps merged" },
  currentInHand: { label: "Current in-hand" },
  currentActual: { label: "Current actual" },
  highestInHand: { label: "Highest in-hand" },
  hikes: { label: "Pay revisions" },
  longestStint: { label: "Longest job" },
  lastHike: { label: "Last pay change" },
};

export const DEFAULT_COMPANY_CARDS: CompanyCardId[] = [
  "companies",
  "stints",
  "experienceMonths",
  "currentInHand",
];

export const COMPANY_CARDS_PREFERENCE_KEY = "companyCards";

export function readCompanyCards(value: unknown): CompanyCardId[] {
  return readCards(value, COMPANY_CARD_IDS, DEFAULT_COMPANY_CARDS);
}

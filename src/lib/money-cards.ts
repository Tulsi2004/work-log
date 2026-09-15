import type { CardOption } from "@/lib/card-preferences";
import { readCards } from "@/lib/card-preferences";

// Every number the money page can put on a card. All of them answer to the
// filters in force, so "received" under a company + month filter means what that
// company paid that month.
export const MONEY_CARD_IDS = [
  "received",
  "spent",
  "saved",
  "entries",
  "avgReceived",
  "biggestEntry",
  "savingsRate",
  "spendRate",
  "topCategory",
  "lastReceived",
] as const;

export type MoneyCardId = (typeof MONEY_CARD_IDS)[number];

export const MONEY_CARD_META: Record<MoneyCardId, CardOption> = {
  received: { label: "Total received" },
  spent: { label: "Total spent" },
  saved: { label: "Saved / invested" },
  entries: { label: "Entries" },
  avgReceived: { label: "Average per entry" },
  biggestEntry: { label: "Biggest single amount" },
  savingsRate: { label: "Savings rate" },
  spendRate: { label: "Spend rate" },
  topCategory: { label: "Biggest category" },
  lastReceived: { label: "Last received" },
};

// What the page showed before the cards became a choice.
export const DEFAULT_MONEY_CARDS: MoneyCardId[] = [
  "received",
  "spent",
  "saved",
  "entries",
];

export const MONEY_CARDS_PREFERENCE_KEY = "moneyCards";

export function readMoneyCards(value: unknown): MoneyCardId[] {
  return readCards(value, MONEY_CARD_IDS, DEFAULT_MONEY_CARDS);
}

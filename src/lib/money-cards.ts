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
  "accountBalance",
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
  accountBalance: { label: "Account balance" },
};

// What the page shows until someone arranges the cards themselves.
export const DEFAULT_MONEY_CARDS: MoneyCardId[] = [
  "spent",
  "received",
  "saved",
  "savingsRate",
  "accountBalance",
];

export const MONEY_CARDS_PREFERENCE_KEY = "moneyCards";

// The one card typed in by hand — the bank knows the balance, the entries don't —
// so it ignores the filters and keeps its number under its own preference.
export const ACCOUNT_BALANCE_PREFERENCE_KEY = "accountBalance";

export function readMoneyCards(value: unknown): MoneyCardId[] {
  return readCards(value, MONEY_CARD_IDS, DEFAULT_MONEY_CARDS);
}

import type { CardOption } from "@/lib/card-preferences";
import { readCards } from "@/lib/card-preferences";

// Every number the money page can put on a card. All of them answer to the
// filters in force, so "received" under a company + month filter means what that
// company paid that month.
export const MONEY_CARD_IDS = [
  "received",
  "spent",
  "saved",
  "invested",
  "entries",
  "avgReceived",
  "biggestEntry",
  "savingsRate",
  "spendRate",
  "topCategory",
  "lastReceived",
  "accountBalance",
  "pf",
] as const;

export type MoneyCardId = (typeof MONEY_CARD_IDS)[number];

export const MONEY_CARD_META: Record<MoneyCardId, CardOption> = {
  received: { label: "Total received" },
  spent: { label: "Total spent" },
  saved: { label: "Saved" },
  invested: { label: "Invested" },
  entries: { label: "Entries" },
  avgReceived: { label: "Average per entry" },
  biggestEntry: { label: "Biggest single amount" },
  savingsRate: { label: "Savings rate" },
  spendRate: { label: "Spend rate" },
  topCategory: { label: "Biggest category" },
  lastReceived: { label: "Last received" },
  accountBalance: { label: "Account balance" },
  pf: { label: "Total PF" },
};

// What the page shows until someone arranges the cards themselves.
export const DEFAULT_MONEY_CARDS: MoneyCardId[] = [
  "spent",
  "received",
  "saved",
  "invested",
  "savingsRate",
  "accountBalance",
];

export const MONEY_CARDS_PREFERENCE_KEY = "moneyCards";

// The one card typed in by hand — the bank knows the balance, the entries don't —
// so it ignores the filters and keeps its numbers under its own preference: one
// balance per bank account, and the card shows them added up.
export const ACCOUNT_BALANCE_PREFERENCE_KEY = "accountBalance";

export interface BankAccount {
  name: string;
  balance: number;
}

// The preference used to hold one bare number; that reads back as a single
// account, so a balance typed in before accounts existed is not lost.
export function readBankAccounts(value: unknown): BankAccount[] {
  if (typeof value === "number") return [{ name: "Account", balance: value }];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is BankAccount => typeof a?.name === "string" && typeof a?.balance === "number"
  );
}

export function readMoneyCards(value: unknown): MoneyCardId[] {
  return readCards(value, MONEY_CARD_IDS, DEFAULT_MONEY_CARDS);
}

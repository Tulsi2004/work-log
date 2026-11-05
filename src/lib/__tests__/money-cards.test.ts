import { expect, it } from "vitest";
import { readBankAccounts } from "@/lib/money-cards";

it("keeps an account's minimum when reading the saved preference", () => {
  const saved = [
    { name: "IOB", balance: 86, minBalance: 500 },
    { name: "Empty", balance: 0, minBalance: 0 },
  ];
  expect(readBankAccounts(saved)).toEqual(saved);
});

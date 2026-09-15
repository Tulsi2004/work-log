// The vocabulary for where money goes. A spend always carries one of these, so a
// category means the same thing everywhere and stays filterable — the same idea
// as the planner's colour labels.
export const SPEND_CATEGORIES = [
  "HOME",
  "BILLS",
  "FOOD",
  "TRAVEL",
  "SHOPPING",
  "HEALTH",
  "FAMILY",
  "EDUCATION",
  "LOAN",
  "SAVINGS",
  "INVESTMENT",
  "FUN",
  "OTHER",
] as const;

export type SpendCategoryValue = (typeof SPEND_CATEGORIES)[number];

interface SpendCategoryMeta {
  name: string;
  // Badge fill, matching the badge palette used across the app.
  badge: string;
  // Solid swatch, for the picker and the breakdown bar.
  dot: string;
}

export const SPEND_CATEGORY_META: Record<SpendCategoryValue, SpendCategoryMeta> = {
  HOME: {
    name: "Rent / Home",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  BILLS: {
    name: "Bills",
    badge: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  FOOD: {
    name: "Food",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  TRAVEL: {
    name: "Travel",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  SHOPPING: {
    name: "Shopping",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  HEALTH: {
    name: "Health",
    badge: "bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
    dot: "bg-pink-500",
  },
  FAMILY: {
    name: "Family",
    badge: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
  },
  EDUCATION: {
    name: "Education",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  LOAN: {
    name: "Loan / EMI",
    badge: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    dot: "bg-red-600",
  },
  SAVINGS: {
    name: "Savings",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  INVESTMENT: {
    name: "Investment",
    badge: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    dot: "bg-green-600",
  },
  FUN: {
    name: "Fun",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  OTHER: {
    name: "Other",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

export function spendCategoryName(category: string): string {
  return SPEND_CATEGORY_META[category as SpendCategoryValue]?.name ?? category;
}

export function spendCategoryMeta(category: string): SpendCategoryMeta {
  return SPEND_CATEGORY_META[category as SpendCategoryValue] ?? SPEND_CATEGORY_META.OTHER;
}

// Amounts are held to two decimals, so every sum of them is rounded back to two
// — otherwise 0.1 + 0.2 leaks a long tail into a total on screen.
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

// Anything that is not a finite number is worth zero — a hand-edited Json row
// should never turn a total into NaN.
export function toMoney(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? roundMoney(amount) : 0;
}

// One line of "what I did with that money", stored inside `SalaryEntry.spends`.
// A type alias rather than an interface, so Prisma accepts an array of these
// straight into the Json column.
export type SalarySpend = {
  what: string;
  amount: number;
  category: SpendCategoryValue;
};

const isCategory = (value: unknown): value is SpendCategoryValue =>
  typeof value === "string" && (SPEND_CATEGORIES as readonly string[]).includes(value);

// `spends` is a Json column, so nothing about its shape is guaranteed — an entry
// written before a category existed still has to read back cleanly.
export function parseSpends(value: unknown): SalarySpend[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const spend = raw as Record<string, unknown>;
    const what = typeof spend.what === "string" ? spend.what : "";
    if (!what.trim()) return [];
    return [
      {
        what,
        amount: toMoney(spend.amount),
        category: isCategory(spend.category) ? spend.category : "OTHER",
      },
    ];
  });
}

// Everything the entry accounts for, spent or kept.
export function sumSpends(spends: SalarySpend[]): number {
  return sumMoney(spends.map((spend) => spend.amount));
}

// Money put into savings or investments has not left your hands — it is
// allocated, not gone. Keeping the two apart stops a month where everything
// went into the bank from reading like a month where everything was spent.
export const KEPT_CATEGORIES: readonly SpendCategoryValue[] = ["SAVINGS", "INVESTMENT"];

export function isKeptCategory(category: string): boolean {
  return KEPT_CATEGORIES.includes(category as SpendCategoryValue);
}

export function sumSpent(spends: SalarySpend[]): number {
  return sumMoney(spends.filter((s) => !isKeptCategory(s.category)).map((s) => s.amount));
}

export function sumSaved(spends: SalarySpend[]): number {
  return sumMoney(spends.filter((s) => isKeptCategory(s.category)).map((s) => s.amount));
}

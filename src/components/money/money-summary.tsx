"use client";

import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Coins,
  Landmark,
  PieChart,
  Receipt,
  Settings2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCustomizeDialog } from "@/components/work-reports/stats-customize-dialog";
import { usePreference } from "@/hooks/use-preference";
import { cn } from "@/lib/utils";
import { isKeptCategory, spendCategoryMeta, sumMoney } from "@/lib/money";
import {
  DEFAULT_MONEY_CARDS,
  MONEY_CARDS_PREFERENCE_KEY,
  MONEY_CARD_IDS,
  MONEY_CARD_META,
  readMoneyCards,
  type MoneyCardId,
} from "@/lib/money-cards";
import { formatDate, formatMoney } from "@/utils/format";
import type { SalaryTotals } from "@/app/api/salary-entries/route";
import type { SalaryEntryWithEmployment } from "@/types";

interface MoneySummaryProps {
  entries: SalaryEntryWithEmployment[];
  totals?: SalaryTotals;
  isLoading: boolean;
  // Narrows the breakdown to one category; clicking the same one again clears it.
  activeCategory?: string;
  onCategoryClick: (category: string) => void;
}

const CARD_ICONS: Record<MoneyCardId, LucideIcon> = {
  received: ArrowDownCircle,
  spent: ArrowUpCircle,
  saved: Landmark,
  entries: Receipt,
  avgReceived: Coins,
  biggestEntry: Trophy,
  savingsRate: PieChart,
  spendRate: PieChart,
  topCategory: PieChart,
  lastReceived: CalendarDays,
};

// A share of what came in — meaningless until something has.
function rate(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

function cardValue(
  id: MoneyCardId,
  totals: SalaryTotals | undefined,
  entries: SalaryEntryWithEmployment[]
): string {
  const received = totals?.received ?? 0;
  const spent = totals?.spent ?? 0;
  const saved = totals?.saved ?? 0;
  const count = totals?.count ?? 0;

  switch (id) {
    case "received":
      return formatMoney(received);
    case "spent":
      return formatMoney(spent);
    case "saved":
      return formatMoney(saved);
    case "entries":
      return String(count);
    case "avgReceived":
      return count > 0 ? formatMoney(sumMoney([received / count])) : "—";
    case "biggestEntry":
      return entries.length ? formatMoney(Math.max(...entries.map((e) => e.amount))) : "—";
    case "savingsRate":
      return rate(saved, received);
    case "spendRate":
      return rate(spent, received);
    case "topCategory": {
      const top = totals?.byCategory[0];
      return top ? spendCategoryMeta(top.category).name : "—";
    }
    // Entries come back newest first.
    case "lastReceived":
      return entries.length ? formatDate(entries[0].date) : "—";
  }
}

export function MoneySummary({
  entries,
  totals,
  isLoading,
  activeCategory,
  onCategoryClick,
}: MoneySummaryProps) {
  const { data: preference } = usePreference(MONEY_CARDS_PREFERENCE_KEY);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const cards = readMoneyCards(preference);
  const byCategory = totals?.byCategory ?? [];
  // Every bar is drawn against the biggest category, so the largest fills the row.
  const biggest = byCategory[0]?.amount ?? 0;
  // The bars cover savings too, so a share here means "of everything allocated".
  const allocated = (totals?.spent ?? 0) + (totals?.saved ?? 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setCustomizeOpen(true)}>
          <Settings2 className="size-4" />
          Customize cards
        </Button>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {cards.map((id) => {
            const Icon = CARD_ICONS[id];
            return (
              <Card key={id}>
                <CardContent className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">
                      {MONEY_CARD_META[id].label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-7 w-20" />
                    ) : (
                      <p className="truncate text-2xl font-semibold">
                        {cardValue(id, totals, entries)}
                      </p>
                    )}
                  </div>
                  <Icon className="size-7 shrink-0 text-muted-foreground/40 sm:size-8" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {byCategory.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">Where it went</p>
            <ul className="space-y-1.5">
              {byCategory.map(({ category, amount }) => {
                const meta = spendCategoryMeta(category);
                const active = activeCategory === category;
                const share = allocated > 0 ? Math.round((amount / allocated) * 100) : 0;

                return (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => onCategoryClick(category)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
                        active && "bg-muted ring-2 ring-ring/50"
                      )}
                    >
                      <span className="w-36 shrink-0 truncate text-sm">
                        {meta.name}
                        {isKeptCategory(category) && (
                          <span className="ml-1 text-xs text-muted-foreground">(kept)</span>
                        )}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn("block h-full rounded-full", meta.dot)}
                          style={{ width: `${biggest > 0 ? (amount / biggest) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                        {share}%
                      </span>
                      <span className="w-24 shrink-0 text-right text-sm tabular-nums">
                        {formatMoney(amount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <StatsCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        cards={cards}
        catalogue={MONEY_CARD_IDS}
        meta={MONEY_CARD_META}
        defaults={DEFAULT_MONEY_CARDS}
        preferenceKey={MONEY_CARDS_PREFERENCE_KEY}
        emptyHint="No cards — the totals strip will be hidden entirely."
      />
    </div>
  );
}

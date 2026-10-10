"use client";

import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  ChevronDown,
  Coins,
  Landmark,
  PieChart,
  PiggyBank,
  Receipt,
  Scale,
  Settings2,
  TrendingUp,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BankAccountsDialog } from "@/components/money/bank-accounts-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCustomizeDialog } from "@/components/work-reports/stats-customize-dialog";
import { useCardStrip, CUSTOM_CARD_ICON } from "@/hooks/use-card-strip";
import { usePreference } from "@/hooks/use-preference";
import { CustomCardDialog } from "@/components/cards/custom-card-dialog";
import { cn } from "@/lib/utils";
import { hasMatured, isKeptCategory, spendCategoryMeta, sumMoney, type SpendCategoryValue } from "@/lib/money";
import { ALL_ENTRIES, useSalaryEntries } from "@/hooks/use-salary-entries";
import {
  ACCOUNT_BALANCE_PREFERENCE_KEY,
  DEFAULT_MONEY_CARDS,
  MONEY_CARDS_PREFERENCE_KEY,
  MONEY_CARD_IDS,
  MONEY_CARD_META,
  readBankAccounts,
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
  invested: TrendingUp,
  entries: Receipt,
  avgReceived: Coins,
  biggestEntry: Trophy,
  savingsRate: PieChart,
  spendRate: PieChart,
  topCategory: PieChart,
  lastReceived: CalendarDays,
  accountBalance: Wallet,
  netWorth: Scale,
  pf: PiggyBank,
};

// A share of what came in — meaningless until something has.
function rate(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

// A card whose number is made of parts. The parts fold away under the arrow, so
// the card sits at the same height as the rest of the strip until asked for —
// then they run the full width under a divider.
function ExpandableCard({
  label,
  icon: Icon,
  value,
  isLoading,
  rows,
  footer,
}: {
  label: string;
  icon: LucideIcon;
  value: React.ReactNode;
  isLoading: boolean;
  // The parts behind the number; with none there is no arrow.
  rows: { label: string; amount: number }[];
  footer?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <div className="flex items-center gap-1">
                <div className="text-2xl leading-tight wrap-break-word font-semibold">{value}</div>
                {rows.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Hide breakdown" : "Show breakdown"}
                    title={expanded ? "Hide breakdown" : "Show breakdown"}
                  >
                    <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
                  </Button>
                )}
              </div>
            )}
          </div>
          <Icon className="size-7 shrink-0 text-muted-foreground/40 sm:size-8" />
        </div>

        {expanded && rows.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <ul className="space-y-1.5 text-sm">
              {rows.map((row, index) => (
                <li key={index} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-muted-foreground">{row.label}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatMoney(row.amount)}</span>
                </li>
              ))}
            </ul>
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// The total across every bank account. Balances are typed in, so they are
// managed in a dialog.
function AccountBalanceCard({ label }: { label: string }) {
  const { data, isLoading } = usePreference(ACCOUNT_BALANCE_PREFERENCE_KEY);
  const accounts = readBankAccounts(data);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ExpandableCard
        label={label}
        icon={Wallet}
        isLoading={isLoading}
        value={
          accounts.length > 0 ? (
            formatMoney(sumMoney(accounts.map((a) => a.balance)))
          ) : (
            // Nothing to fold away yet, so the way in is shown straight off.
            <Button type="button" variant="link" onClick={() => setOpen(true)} className="h-auto px-0 text-base">
              Add bank accounts
            </Button>
          )
        }
        rows={accounts.map((a) => ({ label: a.name, amount: a.balance }))}
        footer={
          <Button type="button" variant="link" size="sm" onClick={() => setOpen(true)} className="h-auto px-0">
            Manage accounts
          </Button>
        }
      />
      <BankAccountsDialog open={open} onOpenChange={setOpen} accounts={accounts} />
    </>
  );
}

// Everything you own: the bank balances, the PF in the passbook, and investments
// still running. Savings are not added on top — money moved to savings sits in
// a bank account whose balance already counts it. Ignores the page filters, like
// the account balance: what you own does not change with the month you look at.
// ponytail: investments count at what was put in, not market value; ones with
// no maturity date count until deleted. A current-value field fixes both.
function NetWorthCard({ label }: { label: string }) {
  const { data: balances, isLoading: balancesLoading } = usePreference(ACCOUNT_BALANCE_PREFERENCE_KEY);
  const { data: all, isLoading: entriesLoading } = useSalaryEntries(ALL_ENTRIES);
  const today = new Date().toISOString().slice(0, 10);

  const bank = sumMoney(readBankAccounts(balances).map((a) => a.balance));
  const pf = all?.totals.pf ?? 0;
  const invested = sumMoney(
    (all?.data ?? [])
      .flatMap((entry) => entry.spends)
      .filter((spend) => spend.category === "INVESTMENT" && !hasMatured(spend, today))
      .map((spend) => spend.amount)
  );

  return (
    <ExpandableCard
      label={label}
      icon={Scale}
      isLoading={balancesLoading || entriesLoading}
      value={formatMoney(sumMoney([bank, pf, invested]))}
      rows={[
        { label: "Bank accounts", amount: bank },
        { label: "PF", amount: pf },
        { label: "Investments", amount: invested },
      ]}
      footer={<p className="text-xs text-muted-foreground">Investments at what you put in; matured ones are left out.</p>}
    />
  );
}

function cardValue(
  id: Exclude<MoneyCardId, "accountBalance" | "netWorth">,
  totals: SalaryTotals | undefined,
  entries: SalaryEntryWithEmployment[]
): string {
  const received = totals?.received ?? 0;
  const spent = totals?.spent ?? 0;
  // Savings and investments together — what the savings rate is measured on.
  const saved = totals?.saved ?? 0;
  const count = totals?.count ?? 0;
  // One kept category on its own, for the cards that show savings and
  // investments separately.
  const keptIn = (category: SpendCategoryValue) =>
    totals?.byCategory.find((c) => c.category === category)?.amount ?? 0;

  switch (id) {
    case "received":
      return formatMoney(received);
    case "spent":
      return formatMoney(spent);
    case "saved":
      return formatMoney(keptIn("SAVINGS"));
    case "invested":
      return formatMoney(keptIn("INVESTMENT"));
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
    case "pf":
      return formatMoney(totals?.pf ?? 0);
  }
}

export function MoneySummary({
  entries,
  totals,
  isLoading,
  activeCategory,
  onCategoryClick,
}: MoneySummaryProps) {
  const strip = useCardStrip(MONEY_CARDS_PREFERENCE_KEY, MONEY_CARD_IDS, MONEY_CARD_META, DEFAULT_MONEY_CARDS);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const cards = strip.cards;
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((id) => {
            // A card the user built carries its own title and its own number.
            const own = strip.customCard(id);
            if (!own && id === "accountBalance") {
              return <AccountBalanceCard key={id} label={MONEY_CARD_META.accountBalance.label} />;
            }
            if (!own && id === "netWorth") {
              return <NetWorthCard key={id} label={MONEY_CARD_META.netWorth.label} />;
            }
            const Icon = own ? CUSTOM_CARD_ICON : CARD_ICONS[id as MoneyCardId];
            return (
              <Card key={id}>
                <CardContent className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">
                      {own ? own.title : MONEY_CARD_META[id as MoneyCardId].label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-7 w-20" />
                    ) : (
                      <p className="text-2xl leading-tight wrap-break-word font-semibold">
                        {own ? (
                          own.display
                        ) : (
                          cardValue(id as Exclude<MoneyCardId, "accountBalance" | "netWorth">, totals, entries)
                        )}
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
        catalogue={strip.catalogue}
        meta={strip.meta}
        defaults={DEFAULT_MONEY_CARDS}
        preferenceKey={MONEY_CARDS_PREFERENCE_KEY}
        emptyHint="No cards — the totals strip will be hidden entirely."
      />
    </div>
  );
}

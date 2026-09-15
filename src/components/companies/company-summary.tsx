"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Settings2,
  Timer,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCustomizeDialog } from "@/components/work-reports/stats-customize-dialog";
import { usePreference } from "@/hooks/use-preference";
import { totalExperienceMonths } from "@/lib/experience";
import {
  COMPANY_CARDS_PREFERENCE_KEY,
  COMPANY_CARD_IDS,
  COMPANY_CARD_META,
  DEFAULT_COMPANY_CARDS,
  readCompanyCards,
  type CompanyCardId,
} from "@/lib/company-cards";
import { formatDate, formatMoney, formatMonths, formatTenure } from "@/utils/format";
import { currentEmployment, currentPayRate, type EmploymentListItem, type PayRate } from "@/types";

interface CompanySummaryProps {
  employments: EmploymentListItem[];
  isLoading: boolean;
}

const CARD_ICONS: Record<CompanyCardId, LucideIcon> = {
  companies: Building2,
  stints: Briefcase,
  currentStints: Timer,
  experienceMonths: CalendarClock,
  currentInHand: Wallet,
  currentActual: Briefcase,
  highestInHand: TrendingUp,
  hikes: ArrowUpRight,
  longestStint: Timer,
  lastHike: CalendarDays,
};

function isCurrent(employment: EmploymentListItem): boolean {
  return !employment.until || new Date(employment.until) >= new Date();
}

function payRates(employment: EmploymentListItem): PayRate[] {
  return (employment.payHistory as PayRate[] | null) ?? [];
}

// Months served in one stint, for comparing stints against each other.
function stintMonths(employment: EmploymentListItem): number {
  return totalExperienceMonths([employment]);
}

function cardValue(id: CompanyCardId, employments: EmploymentListItem[]): string {
  const selected = currentEmployment(employments);
  const pay = selected ? currentPayRate(selected.payHistory) : undefined;

  switch (id) {
    // A company you rejoined is one company but two stints.
    case "companies":
      return String(new Set(employments.map((e) => e.companyId)).size);
    case "stints":
      return String(employments.length);
    case "currentStints":
      return String(employments.filter(isCurrent).length);
    case "experienceMonths":
      return employments.length ? formatMonths(totalExperienceMonths(employments)) : "—";
    case "currentInHand":
      return pay ? formatMoney(pay.inHandSalary) : "—";
    case "currentActual":
      return pay ? formatMoney(pay.actualSalary) : "—";
    case "highestInHand": {
      const rates = employments
        .map((e) => currentPayRate(e.payHistory)?.inHandSalary)
        .filter((amount): amount is number => typeof amount === "number");
      return rates.length ? formatMoney(Math.max(...rates)) : "—";
    }
    // The first rate of a stint is its starting pay, so only what follows is a revision.
    case "hikes": {
      const revisions = employments.reduce((total, e) => total + Math.max(0, payRates(e).length - 1), 0);
      return String(revisions);
    }
    case "longestStint": {
      const longest = employments.reduce<EmploymentListItem | undefined>(
        (best, e) => (!best || stintMonths(e) > stintMonths(best) ? e : best),
        undefined
      );
      return longest ? formatTenure(longest.since, longest.until) ?? "—" : "—";
    }
    case "lastHike": {
      const dates = employments.flatMap((e) => payRates(e).map((rate) => rate.effectiveFrom));
      if (!dates.length) return "—";
      return formatDate(dates.reduce((latest, date) => (date > latest ? date : latest)));
    }
  }
}

export function CompanySummary({ employments, isLoading }: CompanySummaryProps) {
  const { data: preference } = usePreference(COMPANY_CARDS_PREFERENCE_KEY);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const cards = readCompanyCards(preference);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setCustomizeOpen(true)}>
          <Settings2 className="size-4" />
          Customize cards
        </Button>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((id) => {
            const Icon = CARD_ICONS[id];
            return (
              <Card key={id}>
                <CardContent className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">
                      {COMPANY_CARD_META[id].label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-7 w-20" />
                    ) : (
                      <p className="truncate text-2xl font-semibold">{cardValue(id, employments)}</p>
                    )}
                  </div>
                  <Icon className="size-7 shrink-0 text-muted-foreground/40 sm:size-8" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StatsCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        cards={cards}
        catalogue={COMPANY_CARD_IDS}
        meta={COMPANY_CARD_META}
        defaults={DEFAULT_COMPANY_CARDS}
        preferenceKey={COMPANY_CARDS_PREFERENCE_KEY}
        emptyHint="No cards — the strip above the table will be hidden entirely."
      />
    </div>
  );
}

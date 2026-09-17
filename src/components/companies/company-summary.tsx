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
import { useCardStrip, CUSTOM_CARD_ICON } from "@/hooks/use-card-strip";
import { CustomCardDialog } from "@/components/cards/custom-card-dialog";
import { stintLength, totalExperience } from "@/lib/experience";
import {
  COMPANY_CARDS_PREFERENCE_KEY,
  COMPANY_CARD_IDS,
  COMPANY_CARD_META,
  DEFAULT_COMPANY_CARDS,
  type CompanyCardId,
} from "@/lib/company-cards";
import { formatDate, formatMoney, formatSpan, formatTenure } from "@/utils/format";
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
      return employments.length ? formatSpan(totalExperience(employments)) : "—";
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
        (best, e) => (!best || stintLength(e) > stintLength(best) ? e : best),
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
  const strip = useCardStrip(COMPANY_CARDS_PREFERENCE_KEY, COMPANY_CARD_IDS, COMPANY_CARD_META, DEFAULT_COMPANY_CARDS);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const cards = strip.cards;

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
            // A card the user built carries its own title and its own number.
            const own = strip.customCard(id);
            const Icon = own ? CUSTOM_CARD_ICON : CARD_ICONS[id as CompanyCardId];
            return (
              <Card key={id}>
                <CardContent className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">
                      {own ? own.title : COMPANY_CARD_META[id as CompanyCardId].label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-7 w-20" />
                    ) : (
                      <p className="text-2xl leading-tight wrap-break-word font-semibold">
                        {own ? own.display : cardValue(id as CompanyCardId, employments)}
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

      <StatsCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        cards={cards}
        catalogue={strip.catalogue}
        meta={strip.meta}
        defaults={DEFAULT_COMPANY_CARDS}
        preferenceKey={COMPANY_CARDS_PREFERENCE_KEY}
        emptyHint="No cards — the strip above the table will be hidden entirely."
      />
    </div>
  );
}

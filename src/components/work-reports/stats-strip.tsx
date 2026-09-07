"use client";

import { useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coffee,
  FileText,
  Home,
  ListTodo,
  Plane,
  Settings2,
  SunMedium,
  Timer,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCustomizeDialog } from "@/components/work-reports/stats-customize-dialog";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useEmployments } from "@/hooks/use-employments";
import { usePreference } from "@/hooks/use-preference";
import { employmentLabel, formatMonths, formatTenure } from "@/utils/format";
import { currentPayRate, type EmploymentListItem } from "@/types";
import {
  DASHBOARD_CARDS_PREFERENCE_KEY,
  DASHBOARD_CARD_META,
  readDashboardCards,
  type DashboardCardId,
} from "@/lib/dashboard-cards";

type Stats = NonNullable<ReturnType<typeof useDashboardStats>["data"]>;

const CARD_ICONS: Record<DashboardCardId, LucideIcon> = {
  totalWorkReports: ClipboardList,
  totalCompanies: Building2,
  experienceMonths: CalendarClock,
  openTodos: ListTodo,
  doneTodos: CheckCircle2,
  employmentWorkReports: FileText,
  employmentTenure: Timer,
  employmentInHand: Wallet,
  employmentActual: Briefcase,
  officeDays: SunMedium,
  wfhDays: Home,
  halfDays: Coffee,
  leaveDays: Plane,
  companyGrantedLeaveDays: Plane,
  meetings: Users,
  noTaskDays: CalendarDays,
  reportsThisMonth: CalendarDays,
};

// Salary and tenure come off the selected employment, not the stats query.
function cardValue(
  id: DashboardCardId,
  stats: Stats | undefined,
  selected: EmploymentListItem | undefined
): string {
  switch (id) {
    case "experienceMonths":
      return formatMonths(stats?.experienceMonths ?? 0);
    case "employmentTenure":
      return selected ? formatTenure(selected.since, selected.until) ?? "—" : "—";
    case "employmentInHand": {
      const pay = selected ? currentPayRate(selected.payHistory) : undefined;
      return pay ? `₹${pay.inHandSalary}` : "—";
    }
    case "employmentActual": {
      const pay = selected ? currentPayRate(selected.payHistory) : undefined;
      return pay ? `₹${pay.actualSalary}` : "—";
    }
    default:
      return String(stats?.[id] ?? 0);
  }
}

function cardLabel(id: DashboardCardId, selected: EmploymentListItem | undefined): string {
  // The old strip named this card after the company; keep that.
  if (id === "employmentWorkReports") {
    return selected ? employmentLabel(selected) : "Selected company";
  }
  return DASHBOARD_CARD_META[id].label;
}

interface StatsStripProps {
  employmentId?: string;
}

export function StatsStrip({ employmentId }: StatsStripProps) {
  const { data: stats, isLoading } = useDashboardStats(employmentId);
  const { data: employments } = useEmployments();
  const { data: preference } = usePreference(DASHBOARD_CARDS_PREFERENCE_KEY);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const selected = employments?.find((e) => e.id === employmentId);
  const cards = readDashboardCards(preference);

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
                    <p className="truncate text-sm text-muted-foreground">{cardLabel(id, selected)}</p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-7 w-10" />
                    ) : (
                      <p className="truncate text-2xl font-semibold">{cardValue(id, stats, selected)}</p>
                    )}
                  </div>
                  <Icon className="size-7 shrink-0 text-muted-foreground/40 sm:size-8" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StatsCustomizeDialog open={customizeOpen} onOpenChange={setCustomizeOpen} cards={cards} />
    </div>
  );
}

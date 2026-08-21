"use client";

import { ClipboardList, Building2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useEmployments } from "@/hooks/use-employments";
import { employmentLabel } from "@/utils/format";

interface StatsStripProps {
  employmentId?: string;
}

export function StatsStrip({ employmentId }: StatsStripProps) {
  const { data, isLoading } = useDashboardStats(employmentId);
  const { data: employments } = useEmployments();
  const selected = employments?.find((e) => e.id === employmentId);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Work Reports</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-10" />
            ) : (
              <p className="text-2xl font-semibold">{data?.totalWorkReports ?? 0}</p>
            )}
          </div>
          <ClipboardList className="size-7 text-muted-foreground/40 sm:size-8" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Companies</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-10" />
            ) : (
              <p className="text-2xl font-semibold">{data?.totalCompanies ?? 0}</p>
            )}
          </div>
          <Building2 className="size-7 text-muted-foreground/40 sm:size-8" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="truncate text-sm text-muted-foreground">
              {selected ? employmentLabel(selected) : "Selected company"}
            </p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-10" />
            ) : (
              <p className="text-2xl font-semibold">{data?.employmentWorkReports ?? 0}</p>
            )}
          </div>
          <FileText className="size-7 text-muted-foreground/40 sm:size-8" />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { ClipboardList, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/use-dashboard";

export function StatsStrip() {
  const { data, isLoading } = useDashboardStats();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Work Reports</p>
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
    </div>
  );
}

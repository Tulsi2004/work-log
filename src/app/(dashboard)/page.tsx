"use client";

import Link from "next/link";
import { ClipboardList, Building2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { formatDate, formatEnumLabel } from "@/utils/format";

export default function DashboardPage() {
  const { data, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your work reports, at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/work-reports">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Work Reports</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-10" />
                ) : (
                  <p className="text-2xl font-semibold">{data?.totalWorkReports ?? 0}</p>
                )}
              </div>
              <ClipboardList className="size-8 text-muted-foreground/40" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/work-reports">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Companies</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-10" />
                ) : (
                  <p className="text-2xl font-semibold">{data?.totalCompanies ?? 0}</p>
                )}
              </div>
              <Building2 className="size-8 text-muted-foreground/40" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Work Reports</CardTitle>
          <CardDescription>Your latest entries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : data?.recentWorkReports.length ? (
            data.recentWorkReports.map((report) => (
              <Link
                key={report.id}
                href="/work-reports"
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <p className="truncate text-sm font-medium">
                  {formatDate(report.date)} · {report.employment.company.name}
                </p>
                <p className="text-xs text-muted-foreground">{formatEnumLabel(report.dayType)}</p>
              </Link>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No work reports yet. Add your first one above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { use, useState } from "react";
import { StatsStrip } from "@/components/work-reports/stats-strip";
import { WorkReportPanel } from "@/components/work-reports/work-report-panel";
import { useEmployments } from "@/hooks/use-employments";
import { currentEmployment } from "@/types";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // The navbar search sends a hit here as ?q=…&employmentId=…: the work log shows
  // one company at a time, so it opens on the company the report belongs to.
  const params = use(searchParams);
  const search = typeof params.q === "string" ? params.q : "";
  const searchedEmploymentId = typeof params.employmentId === "string" ? params.employmentId : "";
  const searchKey = `${search}|${searchedEmploymentId}`;

  const { data: employments } = useEmployments();
  // A company picked by hand holds until the next search arrives.
  const [picked, setPicked] = useState({ searchKey: "", id: "" });
  const employmentId =
    (picked.searchKey === searchKey && picked.id) || searchedEmploymentId || currentEmployment(employments)?.id || "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Work log</h1>
        <p className="text-sm text-muted-foreground">
          Your daily work reports for the company selected below.
        </p>
      </div>
      <StatsStrip employmentId={employmentId} />
      <WorkReportPanel
        key={searchKey}
        initialSearch={search}
        employmentId={employmentId}
        onEmploymentChange={(id) => setPicked({ searchKey, id })}
      />
    </div>
  );
}

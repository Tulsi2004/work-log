"use client";

import { useState } from "react";
import { StatsStrip } from "@/components/work-reports/stats-strip";
import { WorkReportPanel } from "@/components/work-reports/work-report-panel";
import { useEmployments } from "@/hooks/use-employments";

export default function HomePage() {
  const { data: employments } = useEmployments();
  const [selectedEmploymentId, setSelectedEmploymentId] = useState("");
  const employmentId = selectedEmploymentId || employments?.[0]?.id || "";

  return (
    <div className="space-y-4">
      <StatsStrip employmentId={employmentId} />
      <WorkReportPanel employmentId={employmentId} onEmploymentChange={setSelectedEmploymentId} />
    </div>
  );
}

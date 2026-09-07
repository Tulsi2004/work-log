"use client";

import { useState } from "react";
import { StatsStrip } from "@/components/work-reports/stats-strip";
import { WorkReportPanel } from "@/components/work-reports/work-report-panel";
import { useEmployments } from "@/hooks/use-employments";
import { currentEmployment } from "@/types";

export default function HomePage() {
  const { data: employments } = useEmployments();
  const [selectedEmploymentId, setSelectedEmploymentId] = useState("");
  const employmentId = selectedEmploymentId || currentEmployment(employments)?.id || "";

  return (
    <div className="space-y-4">
      <StatsStrip employmentId={employmentId} />
      <WorkReportPanel employmentId={employmentId} onEmploymentChange={setSelectedEmploymentId} />
    </div>
  );
}

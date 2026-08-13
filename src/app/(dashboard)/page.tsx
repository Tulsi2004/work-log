import { StatsStrip } from "@/components/work-reports/stats-strip";
import { WorkReportPanel } from "@/components/work-reports/work-report-panel";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <StatsStrip />
      <WorkReportPanel />
    </div>
  );
}

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/pages/incidents/HSSEEventDashboard.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/pages/incidents/HSSEEventDashboard');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return restStr;
    return restStr.substring(0, endIdx);
}

// 1. types.ts
const typesCode = `import { DateRange } from "react-day-picker";

export interface DashboardSectionsProps {
  t: any;
  dashboardLoading: boolean;
  dashboardData: any;
  laggingData: any;
  leadingData: any;
  responseData: any;
  peopleData: any;
  daysSince: number | null;
  periodComparison: any;
  getSparklineData: (key: any) => any[];
  trendData: any;
  trendLoading: boolean;
  getPeriodLabel: (period: string) => string;
  laggingLoading: boolean;
  leadingLoading: boolean;
  responseLoading: boolean;
  peopleLoading: boolean;
  startDate: Date;
  startDateStr: string;
  endDate: Date;
  endDateStr: string;
  branchId: string;
  locationLoading: boolean;
  locationData: any;
  reportersLoading: boolean;
  reporters: any;
  heatmapLoading: boolean;
  heatmapData: any;
  incidentTypeData: any;
  incidentTypeLoading: boolean;
  progressionData: any;
  progressionLoading: boolean;
  progressionUpdatedAt: number;
  progressionFetching: boolean;
  rcaData: any;
  rcaLoading: boolean;
  reporterBranchFilter: string;
  setReporterBranchFilter: (val: string) => void;
  locationBranchFilter: string;
  setLocationBranchFilter: (val: string) => void;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesCode);

// 2. DashboardSections.tsx
const sectionsImports = `import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Clock,
  BarChart3,
  MapPin,
  LineChart,
  PieChart,
  Eye,
  Flame,
  ArrowRightLeft,
} from "lucide-react";
import {
  EventTypeDistributionChart,
  SeverityDistributionChart,
  EnhancedEventTrendChart,
  StatusDistributionChart,
  EnhancedLocationAnalytics,
  ReporterLeaderboard,
  ActionsStatusWidget,
  CorrectiveActionDonutChart,
  InvestigationProgressChart,
  BranchComparisonChart,
  DepartmentAnalyticsChart,
  QuickActionsCard,
  RecentEventsCard,
  EnhancedKPIGrid,
  MajorEventsTimeline,
  BranchHeatmapGrid,
  SiteBubbleMap,
  TemporalHeatmap,
  IncidentWaterfallChart,
  DaysSinceCounter,
  LaggingIndicatorsCard,
  LeadingIndicatorsCard,
  ResponseMetricsCard,
  PeopleMetricsCard,
  IncidentMetricsCard,
  KPITrendCard,
  KPIHistoricalTrendChart,
  IncidentTypeBreakdownChart,
  PositiveObservationCard,
  ObservationTrendChart,
  ObservationRatioBreakdown,
  ResidualRiskCard,
  DashboardSection,
  ExecutiveSummaryCard,
  NearMissWidget,
  HeinrichPyramid,
  CrossBranchSummaryCard,
  CrossBranchAnalytics,
  CrossBranchHeatmap,
} from "@/components/incidents/dashboard";
import { DashboardSectionsProps } from "../types";

export function DashboardSections({
  t, dashboardLoading, dashboardData, laggingData, leadingData, responseData,
  peopleData, daysSince, periodComparison, getSparklineData, trendData, trendLoading,
  getPeriodLabel, laggingLoading, leadingLoading, responseLoading, peopleLoading,
  startDate, startDateStr, endDate, endDateStr, branchId, locationLoading, locationData,
  reportersLoading, reporters, heatmapLoading, heatmapData, incidentTypeData,
  incidentTypeLoading, progressionData, progressionLoading, progressionUpdatedAt,
  progressionFetching, rcaData, rcaLoading, reporterBranchFilter, setReporterBranchFilter,
  locationBranchFilter, setLocationBranchFilter
}: DashboardSectionsProps) {
  return (
    <div className="space-y-6">
`;
const sectionsJSX = extractBetween(content, "{/* ========== SECTION 1: Executive Summary (Always Visible) ========== */}", "<DrilldownModal />");
// Wait, the drilldown modal is outside the sections div? The closing div of sections is right before DrilldownModal.
// Let's grab until `<DrilldownModal />`.
fs.writeFileSync(path.join(componentsDir, 'DashboardSections.tsx'), sectionsImports + "    {/* ========== SECTION 1: Executive Summary (Always Visible) ========== */}" + sectionsJSX.trim() + "\n    </div>\n  );\n}\n");

// 3. HSSEEventDashboard.tsx
let shellContent = content.replace(
    /\{\/\* ========== SECTION 1: Executive Summary \(Always Visible\) ========== \*\/\}[\s\S]*?<DrilldownModal \/>/,
    `<DashboardSections
          t={t}
          dashboardLoading={dashboardLoading}
          dashboardData={dashboardData}
          laggingData={laggingData}
          leadingData={leadingData}
          responseData={responseData}
          peopleData={peopleData}
          daysSince={daysSince ?? null}
          periodComparison={periodComparison}
          getSparklineData={getSparklineData}
          trendData={trendData}
          trendLoading={trendLoading}
          getPeriodLabel={getPeriodLabel}
          laggingLoading={laggingLoading}
          leadingLoading={leadingLoading}
          responseLoading={responseLoading}
          peopleLoading={peopleLoading}
          startDate={startDate}
          startDateStr={startDateStr}
          endDate={endDate}
          endDateStr={endDateStr}
          branchId={branchId || ""}
          locationLoading={locationLoading}
          locationData={locationData}
          reportersLoading={reportersLoading}
          reporters={reporters}
          heatmapLoading={heatmapLoading}
          heatmapData={heatmapData}
          incidentTypeData={incidentTypeData}
          incidentTypeLoading={incidentTypeLoading}
          progressionData={progressionData}
          progressionLoading={progressionLoading}
          progressionUpdatedAt={progressionUpdatedAt}
          progressionFetching={progressionFetching}
          rcaData={rcaData}
          rcaLoading={rcaLoading}
          reporterBranchFilter={reporterBranchFilter}
          setReporterBranchFilter={setReporterBranchFilter}
          locationBranchFilter={locationBranchFilter}
          setLocationBranchFilter={setLocationBranchFilter}
        />
        <DrilldownModal />`
);

// We need to add imports to HSSEEventDashboard.tsx
const importInsertIdx = shellContent.lastIndexOf('import ');
const headerEnd = shellContent.indexOf('\n\n', shellContent.indexOf('import'));
shellContent = shellContent.substring(0, headerEnd) + `
import { DashboardSections } from './components/DashboardSections';
` + shellContent.substring(headerEnd);

fs.writeFileSync(path.join(targetDir, 'HSSEEventDashboard.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.ts'), "export { default } from './HSSEEventDashboard';\n");

console.log('HSSEEventDashboard split successfully');

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar,
  RefreshCw, 
  AlertTriangle, 
  ClipboardCheck, 
  Eye, 
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle2
} from "lucide-react";
import { subDays } from "date-fns";
import { useHSSEEventDashboard } from "@/hooks/use-hsse-event-dashboard";
import { useEventsByLocation } from "@/hooks/use-events-by-location";
import { useTopReporters } from "@/hooks/use-top-reporters";
import { useHSSERiskAnalytics } from "@/hooks/use-hsse-risk-analytics";
import { useRCAAnalytics } from "@/hooks/use-rca-analytics";
import { useLocationHeatmap } from "@/hooks/use-location-heatmap";
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
  SafetyKPICards,
  EnhancedAIInsightsPanel,
  QuickActionsCard,
  RecentEventsCard,
  DateRangeFilter,
  EnhancedKPIGrid,
  MajorEventsTimeline,
  RootCauseDistributionChart,
  CauseFlowDiagram,
  BranchHeatmapGrid,
  SiteBubbleMap,
  TemporalHeatmap,
} from "@/components/incidents/dashboard";

function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendLabel,
  variant = 'default',
  onClick,
}: { 
  title: string; 
  value: number | string; 
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}) {
  const bgClass = variant === 'danger' 
    ? 'bg-destructive/10 border-destructive/20' 
    : variant === 'warning' 
      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
      : variant === 'success'
        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
        : 'bg-card';

  const Component = onClick ? 'button' : 'div';

  return (
    <Card className={`${bgClass} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <Component onClick={onClick} className="w-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="text-start">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {trend !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {trend >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                  <span className={`text-xs ${trend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {Math.abs(trend)}% {trendLabel}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-2 rounded-lg ${
              variant === 'danger' ? 'bg-destructive/20' : 
              variant === 'warning' ? 'bg-yellow-200/50 dark:bg-yellow-800/50' : 
              variant === 'success' ? 'bg-green-200/50 dark:bg-green-800/50' :
              'bg-primary/10'
            }`}>
              <Icon className={`h-5 w-5 ${
                variant === 'danger' ? 'text-destructive' : 
                variant === 'warning' ? 'text-yellow-600' : 
                variant === 'success' ? 'text-green-600' :
                'text-primary'
              }`} />
            </div>
          </div>
        </CardContent>
      </Component>
    </Card>
  );
}

export default function HSSEEventDashboard() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useHSSEEventDashboard(startDate, endDate);
  const { data: locationData, isLoading: locationLoading } = useEventsByLocation();
  const { data: reporters, isLoading: reportersLoading } = useTopReporters(10);
  const { insights, isLoading: aiLoading, generateInsights } = useHSSERiskAnalytics();
  const { data: rcaData, isLoading: rcaLoading } = useRCAAnalytics(startDate, endDate);
  const { data: heatmapData, isLoading: heatmapLoading } = useLocationHeatmap(startDate, endDate);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchDashboard();
  };

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleGenerateAIInsights = () => {
    if (dashboardData && locationData) {
      generateInsights({
        ...dashboardData,
        locationData,
      });
    }
  };

  const isLoading = dashboardLoading || locationLoading || reportersLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('hsseDashboard.title')}</h1>
          <p className="text-muted-foreground">{t('hsseDashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('hsseDashboard.refresh')}
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Grid with breakdowns */}
      {dashboardLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dashboardData ? (
        <EnhancedKPIGrid summary={dashboardData.summary} actions={dashboardData.actions} />
      ) : null}

      {/* Quick Actions & Recent Events Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuickActionsCard />
        <RecentEventsCard />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dashboardLoading ? (
          <>
            <Card><CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
            <Card><CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
          </>
        ) : dashboardData ? (
          <>
            <EventTypeDistributionChart data={dashboardData.by_event_type} />
            <SeverityDistributionChart data={dashboardData.by_severity} />
          </>
        ) : null}
      </div>

      {/* Monthly Trend with Filters */}
      <div className="grid grid-cols-1 gap-4">
        {dashboardLoading ? (
          <Card><CardContent className="h-[350px] flex items-center justify-center"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        ) : dashboardData ? (
          <EnhancedEventTrendChart data={dashboardData.monthly_trend} />
        ) : null}
      </div>

      {/* New Charts Row - Corrective Actions & Investigation Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dashboardLoading ? (
          <>
            <Card><CardContent className="h-[320px] flex items-center justify-center"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
            <Card><CardContent className="h-[320px] flex items-center justify-center"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
          </>
        ) : dashboardData ? (
          <>
            <CorrectiveActionDonutChart data={dashboardData.actions} />
            <InvestigationProgressChart data={dashboardData.summary} />
          </>
        ) : null}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dashboardLoading ? (
          <>
            <Card><CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
            <Card><CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
          </>
        ) : dashboardData ? (
          <>
            <StatusDistributionChart data={dashboardData.by_status} />
            <ActionsStatusWidget data={dashboardData.actions} />
          </>
        ) : null}
      </div>

      {/* Branch & Department Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {locationLoading ? (
          <>
            <Card><CardContent className="h-[340px] flex items-center justify-center"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
            <Card><CardContent className="h-[340px] flex items-center justify-center"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
          </>
        ) : locationData ? (
          <>
            <BranchComparisonChart data={locationData.by_branch} />
            <DepartmentAnalyticsChart data={locationData.by_department} />
          </>
        ) : null}
      </div>

      {/* Major Events & RCA Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MajorEventsTimeline events={rcaData?.major_events || []} isLoading={rcaLoading} />
        <RootCauseDistributionChart data={rcaData?.root_cause_distribution || []} isLoading={rcaLoading} />
      </div>

      {/* Cause Flow Diagram */}
      {rcaLoading ? (
        <Card><CardContent className="h-[400px] flex items-center justify-center"><Skeleton className="h-[350px] w-full" /></CardContent></Card>
      ) : rcaData ? (
        <CauseFlowDiagram data={rcaData.cause_flow} />
      ) : null}

      {/* Safety KPIs */}
      {dashboardLoading ? (
        <Card><CardContent className="h-[280px] flex items-center justify-center"><Skeleton className="h-[240px] w-full" /></CardContent></Card>
      ) : dashboardData ? (
        <SafetyKPICards summary={dashboardData.summary} actions={dashboardData.actions} />
      ) : null}

      {/* Location Heatmaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {heatmapLoading ? (
          <>
            <Card><CardContent className="h-[280px] flex items-center justify-center"><Skeleton className="h-[240px] w-full" /></CardContent></Card>
            <Card><CardContent className="h-[280px] flex items-center justify-center"><Skeleton className="h-[240px] w-full" /></CardContent></Card>
            <Card><CardContent className="h-[280px] flex items-center justify-center"><Skeleton className="h-[240px] w-full" /></CardContent></Card>
          </>
        ) : heatmapData ? (
          <>
            <BranchHeatmapGrid data={heatmapData.branches} />
            <SiteBubbleMap data={heatmapData.sites} />
            <TemporalHeatmap data={heatmapData.temporal} maxCount={heatmapData.maxTemporalCount} />
          </>
        ) : null}
      </div>

      {/* Enhanced Location Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {locationLoading ? (
          <Card><CardContent className="h-[400px] flex items-center justify-center"><Skeleton className="h-[350px] w-full" /></CardContent></Card>
        ) : locationData ? (
          <EnhancedLocationAnalytics data={locationData} />
        ) : null}

        {reportersLoading ? (
          <Card><CardContent className="h-[400px] flex items-center justify-center"><Skeleton className="h-[350px] w-full" /></CardContent></Card>
        ) : reporters ? (
          <ReporterLeaderboard reporters={reporters} />
        ) : null}
      </div>

      {/* AI Risk Insights */}
      <EnhancedAIInsightsPanel 
        insights={insights} 
        isLoading={aiLoading} 
        onRefresh={handleGenerateAIInsights}
        lastUpdated={insights ? new Date() : undefined}
      />
    </div>
  );
}

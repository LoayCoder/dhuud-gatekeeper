import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { subDays } from "date-fns";
import { useHSSEEventDashboard } from "@/hooks/use-hsse-event-dashboard";
import { useEventsByLocation } from "@/hooks/use-events-by-location";
import { useTopReporters } from "@/hooks/use-top-reporters";
import { useHSSERiskAnalytics } from "@/hooks/use-hsse-risk-analytics";
import { useRCAAnalytics } from "@/hooks/use-rca-analytics";
import { useLocationHeatmap } from "@/hooks/use-location-heatmap";
import { useDashboardRealtime } from "@/hooks/use-dashboard-realtime";
import { useIncidentProgression } from "@/hooks/use-incident-progression";
import { useDashboardPrefetch } from "@/hooks/use-dashboard-prefetch";
import { DrilldownProvider } from "@/contexts/DrilldownContext";
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
  DashboardExportDropdown,
  LiveUpdateIndicator,
  AutoRefreshToggle,
  DrilldownModal,
  RootCauseParetoChart,
  IncidentWaterfallChart,
  DashboardCacheStatus,
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
    ? 'bg-gradient-to-br from-destructive/15 to-destructive/5 border-destructive/30' 
    : variant === 'warning' 
      ? 'bg-gradient-to-br from-warning/20 to-warning/5 border-warning/30'
      : variant === 'success'
        ? 'bg-gradient-to-br from-chart-3/20 to-chart-3/5 border-chart-3/30'
        : 'bg-gradient-to-br from-card to-muted/30';

  const Component = onClick ? 'button' : 'div';

  return (
    <Card className={`${bgClass} ${onClick ? 'cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]' : ''}`}>
      <Component onClick={onClick} className="w-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="text-start">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {trend !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {trend >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-destructive" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-chart-3" />
                  )}
                  <span className={`text-xs ${trend >= 0 ? 'text-destructive' : 'text-chart-3'}`}>
                    {Math.abs(trend)}% {trendLabel}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-2.5 rounded-xl shadow-sm ${
              variant === 'danger' ? 'bg-destructive/20' : 
              variant === 'warning' ? 'bg-warning/20' : 
              variant === 'success' ? 'bg-chart-3/20' :
              'bg-primary/10'
            }`}>
              <Icon className={`h-5 w-5 ${
                variant === 'danger' ? 'text-destructive' : 
                variant === 'warning' ? 'text-warning' : 
                variant === 'success' ? 'text-chart-3' :
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
  const dashboardRef = useRef<HTMLDivElement>(null);

  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard, dataUpdatedAt: dashboardUpdatedAt, isFetching: dashboardFetching } = useHSSEEventDashboard(startDate, endDate);
  const { data: locationData, isLoading: locationLoading, dataUpdatedAt: locationUpdatedAt, isFetching: locationFetching } = useEventsByLocation();
  const { data: reporters, isLoading: reportersLoading } = useTopReporters(10);
  const { insights, isLoading: aiLoading, generateInsights } = useHSSERiskAnalytics();
  const { data: rcaData, isLoading: rcaLoading, dataUpdatedAt: rcaUpdatedAt, isFetching: rcaFetching } = useRCAAnalytics(startDate, endDate);
  const { data: heatmapData, isLoading: heatmapLoading } = useLocationHeatmap(startDate, endDate);
  const { data: progressionData, isLoading: progressionLoading, dataUpdatedAt: progressionUpdatedAt, isFetching: progressionFetching } = useIncidentProgression(startDate, endDate);

  // Prefetch dashboard data for improved performance
  useDashboardPrefetch(startDate, endDate);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    refetchDashboard();
  }, [refetchDashboard]);

  const { isConnected, newEventCount, acknowledgeEvents } = useDashboardRealtime(handleRefresh);

  const handleRefreshAndAcknowledge = () => {
    handleRefresh();
    acknowledgeEvents();
  };

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleGenerateAIInsights = () => {
    if (dashboardData && locationData) {
      // Build richer context for AI analysis
      const aiContext = {
        ...dashboardData,
        locationData,
        // Add RCA data for root cause pattern analysis
        rca_data: rcaData ? {
          total_rcas: rcaData.root_cause_distribution?.length || 0,
          top_categories: rcaData.root_cause_distribution?.slice(0, 5).map((r: any) => r.category) || [],
          major_events_count: rcaData.major_events?.length || 0,
        } : null,
        // Add observation behavior data
        observation_behaviors: dashboardData.by_subtype ? {
          positive: (dashboardData.by_subtype as any)?.safe_condition || 0,
          negative: ((dashboardData.by_subtype as any)?.unsafe_act || 0) + ((dashboardData.by_subtype as any)?.unsafe_condition || 0),
          ratio: ((dashboardData.by_subtype as any)?.safe_condition || 0) > 0 && 
                 (((dashboardData.by_subtype as any)?.unsafe_act || 0) + ((dashboardData.by_subtype as any)?.unsafe_condition || 0)) > 0
            ? `${(((dashboardData.by_subtype as any)?.safe_condition || 0) / 
                  (((dashboardData.by_subtype as any)?.unsafe_act || 0) + ((dashboardData.by_subtype as any)?.unsafe_condition || 0) || 1)).toFixed(2)}:1`
            : 'N/A',
        } : null,
        // Add near miss data for leading indicator analysis
        near_miss_data: {
          total: dashboardData.summary?.near_miss_count || 0,
          rate: `${dashboardData.summary?.near_miss_rate || 0}%`,
        },
      };
      generateInsights(aiContext);
    }
  };

  const isLoading = dashboardLoading || locationLoading || reportersLoading;

  return (
    <DrilldownProvider>
      <div ref={dashboardRef} className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('hsseDashboard.title')}</h1>
          <p className="text-muted-foreground">{t('hsseDashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardCacheStatus 
            cacheInfos={[
              { dataUpdatedAt: dashboardUpdatedAt, isFetching: dashboardFetching },
              { dataUpdatedAt: locationUpdatedAt, isFetching: locationFetching },
              { dataUpdatedAt: rcaUpdatedAt, isFetching: rcaFetching },
              { dataUpdatedAt: progressionUpdatedAt, isFetching: progressionFetching },
            ]}
          />
          <LiveUpdateIndicator 
            isConnected={isConnected} 
            newEventCount={newEventCount}
            onAcknowledge={handleRefreshAndAcknowledge}
          />
          <AutoRefreshToggle onRefresh={handleRefresh} disabled={isLoading} />
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
          <DashboardExportDropdown 
            dashboardRef={dashboardRef}
            dashboardData={dashboardData}
            locationData={locationData}
            rcaData={rcaData}
          />
          <Button variant="outline" size="sm" onClick={handleRefreshAndAcknowledge} disabled={isLoading} className="relative">
            <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('hsseDashboard.refresh')}
            {newEventCount > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -end-2 h-5 min-w-5 px-1 text-xs">
                {newEventCount > 99 ? '99+' : newEventCount}
              </Badge>
            )}
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

      {/* Advanced Analytics Row - Pareto & Waterfall Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RootCauseParetoChart 
          data={rcaData?.root_cause_distribution || []} 
          isLoading={rcaLoading} 
          dataUpdatedAt={rcaUpdatedAt}
          isFetching={rcaFetching}
        />
        <IncidentWaterfallChart 
          data={progressionData?.waterfall || []} 
          isLoading={progressionLoading}
          dataUpdatedAt={progressionUpdatedAt}
          isFetching={progressionFetching}
        />
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
      
      {/* Drilldown Modal */}
      <DrilldownModal />
    </div>
    </DrilldownProvider>
  );
}

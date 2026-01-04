import { useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  RefreshCw, 
  Activity,
  Clock,
  Users,
  BarChart3,
  Building2,
  MapPin,
  LineChart,
  PieChart,
  GitBranch,
  Lightbulb,
  Eye,
  Flame,
} from "lucide-react";
import { subDays, subMonths, startOfYear, format } from "date-fns";
import { useHSSEEventDashboard } from "@/hooks/use-hsse-event-dashboard";
import { useEventsByLocation } from "@/hooks/use-events-by-location";
import { useTopReporters } from "@/hooks/use-top-reporters";
import { useHSSERiskAnalytics } from "@/hooks/use-hsse-risk-analytics";
import { useRCAAnalytics } from "@/hooks/use-rca-analytics";
import { useLocationHeatmap } from "@/hooks/use-location-heatmap";
import { useDashboardRealtime } from "@/hooks/use-dashboard-realtime";
import { useIncidentProgression } from "@/hooks/use-incident-progression";
import { useDashboardPrefetch } from "@/hooks/use-dashboard-prefetch";
import { useBranches } from "@/hooks/use-branches";
import { useSites } from "@/hooks/use-sites";
import { useIncidentTypeDistribution } from "@/hooks/use-incident-type-distribution";
import {
  useLaggingIndicators,
  useLeadingIndicators,
  useResponseMetrics,
  usePeopleMetrics,
  useDaysSinceLastRecordable,
  useKPITargets,
  getKPIStatus,
} from "@/hooks/use-kpi-indicators";
import { useKPIHistoricalTrend, useKPIPeriodComparison, getPeriodLabel } from "@/hooks/use-kpi-trends";
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
  DaysSinceCounter,
  LaggingIndicatorsCard,
  LeadingIndicatorsCard,
  ResponseMetricsCard,
  PeopleMetricsCard,
  KPIAlertsBanner,
  IncidentMetricsCard,
  KPIDashboardExport,
  KPITrendCard,
  KPIHistoricalTrendChart,
  IncidentTypeBreakdownChart,
  PositiveObservationCard,
  ObservationTrendChart,
  ObservationRatioBreakdown,
  ResidualRiskCard,
  DashboardSection,
  ExecutiveSummaryCard,
  CriticalAlertBanner,
  NearMissWidget,
  HeinrichPyramid,
  DataQualityIndicator,
} from "@/components/incidents/dashboard";
import { useHSSEAlerts } from "@/hooks/use-hsse-alerts";

type DateRange = 'week' | 'month' | '30days' | '90days' | 'ytd';

export default function HSSEEventDashboard() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [kpiDateRange, setKpiDateRange] = useState<DateRange>('month');
  const [branchId, setBranchId] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Branch/Site data
  const { data: branches } = useBranches();
  const { data: sites } = useSites(branchId || undefined);
  const { data: targets } = useKPITargets();

  // Calculate KPI date range
  const { kpiStartDate, kpiEndDate } = useMemo(() => {
    const today = new Date();
    let start: Date;
    const end = today;

    switch (kpiDateRange) {
      case 'week':
        start = subDays(today, 7);
        break;
      case 'month':
        start = subMonths(today, 1);
        break;
      case '30days':
        start = subDays(today, 30);
        break;
      case '90days':
        start = subDays(today, 90);
        break;
      case 'ytd':
        start = startOfYear(today);
        break;
      default:
        start = subMonths(today, 1);
    }

    return {
      kpiStartDate: format(start, 'yyyy-MM-dd'),
      kpiEndDate: format(end, 'yyyy-MM-dd'),
    };
  }, [kpiDateRange]);

  // Event dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard, dataUpdatedAt: dashboardUpdatedAt, isFetching: dashboardFetching } = useHSSEEventDashboard(startDate, endDate);
  const { data: locationData, isLoading: locationLoading, dataUpdatedAt: locationUpdatedAt, isFetching: locationFetching } = useEventsByLocation();
  const { data: reporters, isLoading: reportersLoading } = useTopReporters(10);
  const { insights, isLoading: aiLoading, generateInsights } = useHSSERiskAnalytics();
  const { data: rcaData, isLoading: rcaLoading, dataUpdatedAt: rcaUpdatedAt, isFetching: rcaFetching } = useRCAAnalytics(startDate, endDate);
  const { data: heatmapData, isLoading: heatmapLoading } = useLocationHeatmap(startDate, endDate);
  const { data: progressionData, isLoading: progressionLoading, dataUpdatedAt: progressionUpdatedAt, isFetching: progressionFetching } = useIncidentProgression(startDate, endDate);
  const { data: incidentTypeData, isLoading: incidentTypeLoading } = useIncidentTypeDistribution(startDate, endDate);

  // KPI data
  const { data: laggingData, isLoading: laggingLoading, refetch: refetchLagging } = useLaggingIndicators(kpiStartDate, kpiEndDate, branchId || undefined, siteId || undefined);
  const { data: leadingData, isLoading: leadingLoading, refetch: refetchLeading } = useLeadingIndicators(kpiStartDate, kpiEndDate, branchId || undefined, siteId || undefined);
  const { data: responseData, isLoading: responseLoading, refetch: refetchResponse } = useResponseMetrics(kpiStartDate, kpiEndDate, branchId || undefined, siteId || undefined);
  const { data: peopleData, isLoading: peopleLoading, refetch: refetchPeople } = usePeopleMetrics(kpiStartDate, kpiEndDate, branchId || undefined, siteId || undefined);
  const { data: daysSince, refetch: refetchDays } = useDaysSinceLastRecordable(branchId || undefined, siteId || undefined);

  // Trend data
  const periodForComparison = kpiDateRange === 'week' ? 'week' : kpiDateRange === '90days' ? '90days' : kpiDateRange === 'ytd' ? 'ytd' : 'month';
  const { data: trendData, isLoading: trendLoading, refetch: refetchTrend } = useKPIHistoricalTrend(undefined, undefined, branchId || undefined, siteId || undefined);
  const { data: periodComparison, refetch: refetchComparison } = useKPIPeriodComparison(periodForComparison, branchId || undefined, siteId || undefined);

  // Prefetch dashboard data for improved performance
  useDashboardPrefetch(startDate, endDate);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    refetchDashboard();
    refetchLagging();
    refetchLeading();
    refetchResponse();
    refetchPeople();
    refetchDays();
    refetchTrend();
    refetchComparison();
  }, [refetchDashboard, refetchLagging, refetchLeading, refetchResponse, refetchPeople, refetchDays, refetchTrend, refetchComparison]);

  const { isConnected, newEventCount, acknowledgeEvents } = useDashboardRealtime(handleRefresh);

  // HSSE Alerts - use existing summary data for alerts
  const alertIncidents = useMemo(() => {
    if (!dashboardData) return [];
    // Build a simplified incidents array from severity data for alert detection
    const incidents: any[] = [];
    const criticalCount = dashboardData.by_severity?.level_5 ?? 0;
    const highCount = dashboardData.by_severity?.level_4 ?? 0;
    for (let i = 0; i < criticalCount; i++) {
      incidents.push({ severity: 'critical', created_at: new Date().toISOString() });
    }
    for (let i = 0; i < highCount; i++) {
      incidents.push({ severity: 'high', created_at: new Date().toISOString() });
    }
    return incidents;
  }, [dashboardData]);

  const alertActions = useMemo(() => {
    if (!dashboardData?.actions) return [];
    // Build simplified actions array for alert detection
    const actions: any[] = [];
    const overdueCount = dashboardData.actions.overdue_actions ?? 0;
    const openCount = dashboardData.actions.open_actions ?? 0;
    for (let i = 0; i < overdueCount; i++) {
      actions.push({ status: 'open', due_date: new Date(Date.now() - 86400000).toISOString() });
    }
    for (let i = 0; i < (openCount - overdueCount); i++) {
      actions.push({ status: 'open', due_date: new Date(Date.now() + 86400000).toISOString() });
    }
    return actions;
  }, [dashboardData]);

  const { alerts: hsseAlerts, hasCritical: hasHSSECritical } = useHSSEAlerts({
    incidents: alertIncidents,
    actions: alertActions,
    inspections: [],
  });

  const handleRefreshAndAcknowledge = () => {
    handleRefresh();
    acknowledgeEvents();
  };

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleGenerateAIInsights = () => {
    console.log("Generate AI Insights clicked", { dashboardData: !!dashboardData, locationData: !!locationData });
    
    // Allow generation even if locationData is null - use empty defaults
    if (dashboardData) {
      const aiContext = {
        ...dashboardData,
        locationData: locationData || { by_branch: [], by_department: [] },
        rca_data: rcaData ? {
          total_rcas: rcaData.root_cause_distribution?.length || 0,
          top_categories: rcaData.root_cause_distribution?.slice(0, 5).map((r: any) => r.category) || [],
          major_events_count: rcaData.major_events?.length || 0,
        } : null,
        observation_behaviors: dashboardData.by_subtype ? {
          positive: (dashboardData.by_subtype as any)?.safe_condition || 0,
          negative: ((dashboardData.by_subtype as any)?.unsafe_act || 0) + ((dashboardData.by_subtype as any)?.unsafe_condition || 0),
          ratio: ((dashboardData.by_subtype as any)?.safe_condition || 0) > 0 && 
                 (((dashboardData.by_subtype as any)?.unsafe_act || 0) + ((dashboardData.by_subtype as any)?.unsafe_condition || 0)) > 0
            ? `${(((dashboardData.by_subtype as any)?.safe_condition || 0) / 
                  (((dashboardData.by_subtype as any)?.unsafe_act || 0) + ((dashboardData.by_subtype as any)?.unsafe_condition || 0) || 1)).toFixed(2)}:1`
            : 'N/A',
        } : null,
        near_miss_data: {
          total: dashboardData.summary?.near_miss_count || 0,
          rate: `${dashboardData.summary?.near_miss_rate || 0}%`,
        },
      };
      console.log("Calling generateInsights with context", Object.keys(aiContext));
      generateInsights(aiContext);
    } else {
      console.warn("Cannot generate insights: dashboardData is null");
    }
  };

  // Convert trend data to sparkline format
  const getSparklineData = (key: 'trir' | 'ltifr' | 'dart' | 'severity_rate' | 'action_closure_pct') => {
    if (!trendData) return [];
    return trendData.slice(-6).map(item => ({ value: Number(item[key]) || 0 }));
  };

  // Generate alerts from KPI data
  const alerts = useMemo(() => {
    if (!laggingData || !targets) return [];

    const kpiAlerts: {
      code: string;
      label: string;
      value: number;
      threshold: number;
      severity: 'warning' | 'critical';
    }[] = [];

    const checkKPI = (code: string, label: string, value: number) => {
      const target = targets.find((t) => t.kpi_code === code);
      if (!target) return;

      const status = getKPIStatus(value, target);
      if (status === 'warning') {
        kpiAlerts.push({ code, label, value, threshold: target.warning_threshold, severity: 'warning' });
      } else if (status === 'critical') {
        kpiAlerts.push({ code, label, value, threshold: target.critical_threshold, severity: 'critical' });
      }
    };

    checkKPI('trir', 'TRIR', laggingData.trir);
    checkKPI('ltifr', 'LTIFR', laggingData.ltifr);
    checkKPI('dart_rate', 'DART Rate', laggingData.dart_rate);
    checkKPI('severity_rate', 'Severity Rate', laggingData.severity_rate);

    return kpiAlerts;
  }, [laggingData, targets]);

  const isLoading = dashboardLoading || locationLoading || reportersLoading;
  const kpiLoading = laggingLoading || leadingLoading || responseLoading || peopleLoading || trendLoading;

  return (
    <DrilldownProvider>
      <div ref={dashboardRef} className="container mx-auto py-6 space-y-6">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">{t('hsseDashboard.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('hsseDashboard.subtitle')}</p>
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
            <AutoRefreshToggle onRefresh={handleRefresh} disabled={isLoading || kpiLoading} />
            <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
            <DashboardExportDropdown 
              dashboardRef={dashboardRef}
              dashboardData={dashboardData}
              locationData={locationData}
              rcaData={rcaData}
            />
            <Button variant="outline" size="sm" onClick={handleRefreshAndAcknowledge} disabled={isLoading || kpiLoading} className="relative">
              <RefreshCw className={`h-4 w-4 me-2 ${isLoading || kpiLoading ? 'animate-spin' : ''}`} />
              {t('hsseDashboard.refresh')}
              {newEventCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -end-2 h-5 min-w-5 px-1 text-xs">
                  {newEventCount > 99 ? '99+' : newEventCount}
                </Badge>
              )}
            </Button>
          </div>
        </header>

        {/* Critical Alerts Banner */}
        {dashboardData && (
          <CriticalAlertBanner 
            summary={{
              critical_count: dashboardData.by_severity?.level_5 ?? 0,
              high_count: dashboardData.by_severity?.level_4 ?? 0,
              total_count: dashboardData.summary?.total_events ?? 0,
            }} 
            actionStats={{
              overdue: dashboardData.actions?.overdue_actions ?? 0,
              total: dashboardData.actions?.total_actions ?? 0,
              open: dashboardData.actions?.open_actions ?? 0,
            }}
          />
        )}

        {/* Data Quality Indicator */}
        {dashboardData && (
          <DataQualityIndicator 
            incidents={alertIncidents}
            observations={[]}
            actions={alertActions}
          />
        )}

        {/* KPI Alerts Banner */}
        <KPIAlertsBanner alerts={alerts} />

        {/* ========== SECTION 1: Executive Summary (Always Visible) ========== */}
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Executive Summary Card */}
            <div className="lg:col-span-2">
              {dashboardLoading ? (
                <Card><CardContent className="h-[260px] flex items-center justify-center"><Skeleton className="h-[220px] w-full" /></CardContent></Card>
              ) : dashboardData ? (
                <ExecutiveSummaryCard 
                  summary={dashboardData.summary} 
                  actions={dashboardData.actions}
                  trir={laggingData?.trir}
                  ltifr={laggingData?.ltifr}
                  actionClosureRate={leadingData?.action_closure_pct}
                />
              ) : null}
            </div>
            
            {/* Days Since Counter */}
            <DaysSinceCounter
              days={daysSince ?? 0}
              label={t('kpiDashboard.daysSinceRecordable', 'Days Since Last Recordable Injury')}
              milestone={100}
            />
          </div>
        </section>

        {/* KPI Trend Cards Row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPITrendCard
            title="TRIR"
            value={laggingData?.trir ?? 0}
            previousValue={periodComparison?.trir?.previous_value}
            sparklineData={getSparklineData('trir')}
            trend={periodComparison?.trir?.trend_direction as 'up' | 'down' | 'stable'}
            invertColors={true}
            isLoading={laggingLoading}
            periodLabel={getPeriodLabel(periodForComparison)}
          />
          <KPITrendCard
            title="LTIFR"
            value={laggingData?.ltifr ?? 0}
            previousValue={periodComparison?.ltifr?.previous_value}
            sparklineData={getSparklineData('ltifr')}
            trend={periodComparison?.ltifr?.trend_direction as 'up' | 'down' | 'stable'}
            invertColors={true}
            isLoading={laggingLoading}
            periodLabel={getPeriodLabel(periodForComparison)}
          />
          <KPITrendCard
            title={t('kpiDashboard.actionClosure', 'Action Closure')}
            value={leadingData?.action_closure_pct ?? 0}
            previousValue={periodComparison?.action_closure_pct?.previous_value}
            sparklineData={getSparklineData('action_closure_pct')}
            trend={periodComparison?.action_closure_pct?.trend_direction as 'up' | 'down' | 'stable'}
            invertColors={false}
            suffix="%"
            isLoading={leadingLoading}
            periodLabel={getPeriodLabel(periodForComparison)}
          />
          <KPITrendCard
            title={t('kpiDashboard.avgInvestigationDays', 'Avg Investigation')}
            value={responseData?.avg_investigation_days ?? 0}
            invertColors={true}
            suffix=" days"
            isLoading={responseLoading}
          />
        </div>

        {/* KPI Filters Row */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">{t('kpiDashboard.filters', 'KPI Filters')}:</span>
          <Select value={kpiDateRange} onValueChange={(v) => setKpiDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('common.lastWeek', 'Last Week')}</SelectItem>
              <SelectItem value="month">{t('common.lastMonth', 'Last Month')}</SelectItem>
              <SelectItem value="30days">{t('common.last30Days', 'Last 30 Days')}</SelectItem>
              <SelectItem value="90days">{t('common.last90Days', 'Last 90 Days')}</SelectItem>
              <SelectItem value="ytd">{t('common.ytd', 'Year to Date')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={branchId || 'all'} onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px] h-8">
              <Building2 className="me-2 h-4 w-4" />
              <SelectValue placeholder={t('common.allBranches', 'All Branches')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allBranches', 'All Branches')}</SelectItem>
              {branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={siteId || 'all'} onValueChange={(v) => setSiteId(v === 'all' ? '' : v)} disabled={!branchId}>
            <SelectTrigger className="w-[160px] h-8">
              <MapPin className="me-2 h-4 w-4" />
              <SelectValue placeholder={t('common.allSites', 'All Sites')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allSites', 'All Sites')}</SelectItem>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <KPIDashboardExport
            laggingData={laggingData ?? null}
            leadingData={leadingData ?? null}
            responseData={responseData ?? null}
            peopleData={peopleData ?? null}
            dateRange={{ start: kpiStartDate, end: kpiEndDate }}
          />
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

        {/* ========== SECTION 2: KPI Analysis (Consolidated 4 Tabs) ========== */}
        <DashboardSection 
          title={t('hsseDashboard.kpiAnalysis', 'KPI Analysis')} 
          icon={Activity}
          defaultExpanded={true}
        >
          <Tabs defaultValue="safety" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-4">
              <TabsTrigger value="safety" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">{t('kpiDashboard.safetyKPIs', 'Safety KPIs')}</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">{t('kpiDashboard.operations', 'Operations')}</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-2">
                <LineChart className="h-4 w-4" />
                <span className="hidden sm:inline">{t('kpiDashboard.trends', 'Trends')}</span>
              </TabsTrigger>
              <TabsTrigger value="metrics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('kpiDashboard.metrics', 'Metrics')}</span>
              </TabsTrigger>
            </TabsList>

            {/* Safety KPIs Tab (Merged Lagging + Leading) */}
            <TabsContent value="safety" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LaggingIndicatorsCard data={laggingData ?? null} isLoading={laggingLoading} />
                <LeadingIndicatorsCard data={leadingData ?? null} isLoading={leadingLoading} />
              </div>
            </TabsContent>

            {/* Operations Tab (Merged Response + People) */}
            <TabsContent value="operations" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ResponseMetricsCard data={responseData ?? null} isLoading={responseLoading} />
                <PeopleMetricsCard data={peopleData ?? null} isLoading={peopleLoading} />
              </div>
            </TabsContent>

            <TabsContent value="trends">
              <KPIHistoricalTrendChart data={trendData || []} isLoading={trendLoading} />
            </TabsContent>

            <TabsContent value="metrics">
              <IncidentMetricsCard
                startDate={kpiStartDate}
                endDate={kpiEndDate}
                branchId={branchId || undefined}
                siteId={siteId || undefined}
              />
            </TabsContent>
          </Tabs>
        </DashboardSection>

        {/* ========== SECTION 3: Event Distribution ========== */}
        <DashboardSection 
          title={t('hsseDashboard.eventDistribution', 'Event Distribution')} 
          icon={PieChart}
          defaultExpanded={false}
        >
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
          
          {dashboardLoading ? (
            <Card><CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
          ) : dashboardData ? (
            <StatusDistributionChart data={dashboardData.by_status} />
          ) : null}

          <IncidentTypeBreakdownChart data={incidentTypeData || []} isLoading={incidentTypeLoading} />
        </DashboardSection>

        {/* ========== SECTION 4: Trend Analysis ========== */}
        <DashboardSection 
          title={t('hsseDashboard.trendAnalysis', 'Trend Analysis')} 
          icon={LineChart}
          defaultExpanded={false}
        >
          {dashboardLoading ? (
            <Card><CardContent className="h-[350px] flex items-center justify-center"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
          ) : dashboardData ? (
            <EnhancedEventTrendChart data={dashboardData.monthly_trend} />
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <IncidentWaterfallChart 
              data={progressionData?.waterfall || []} 
              isLoading={progressionLoading}
              dataUpdatedAt={progressionUpdatedAt}
              isFetching={progressionFetching}
            />
            <MajorEventsTimeline events={rcaData?.major_events || []} isLoading={rcaLoading} />
          </div>
        </DashboardSection>

        {/* ========== SECTION 5: Actions & Investigations ========== */}
        <DashboardSection 
          title={t('hsseDashboard.actionsInvestigations', 'Actions & Investigations')} 
          icon={Flame}
          defaultExpanded={false}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {dashboardLoading ? (
              <>
                <Card><CardContent className="h-[320px] flex items-center justify-center"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
                <Card><CardContent className="h-[320px] flex items-center justify-center"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
                <Card><CardContent className="h-[320px] flex items-center justify-center"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
              </>
            ) : dashboardData ? (
              <>
                <CorrectiveActionDonutChart data={dashboardData.actions} />
                <InvestigationProgressChart data={dashboardData.summary} />
                <ActionsStatusWidget data={dashboardData.actions} />
              </>
            ) : null}
          </div>
        </DashboardSection>

        {/* ========== SECTION 6: Location Analytics ========== */}
        <DashboardSection 
          title={t('hsseDashboard.locationAnalytics', 'Location Analytics')} 
          icon={MapPin}
          defaultExpanded={false}
        >
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
        </DashboardSection>

        {/* ========== SECTION 7: Observations ========== */}
        <DashboardSection 
          title={t('hsseDashboard.observations', 'Observations')} 
          icon={Eye}
          defaultExpanded={false}
        >
          {/* Near Miss and Heinrich Pyramid Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardData && (
              <NearMissWidget 
                nearMissCount={dashboardData.by_event_type?.near_miss ?? 0}
                incidentCount={dashboardData.by_event_type?.incident ?? 0}
              />
            )}
            {dashboardData && (
              <HeinrichPyramid
                fatalOrMajor={dashboardData.by_severity?.level_5 ?? 0}
                minorInjuries={(dashboardData.by_severity?.level_4 ?? 0) + (dashboardData.by_severity?.level_3 ?? 0)}
                nearMisses={dashboardData.by_event_type?.near_miss ?? 0}
                unsafeActs={((dashboardData.by_subtype as Record<string, number>)?.unsafe_act ?? 0) + ((dashboardData.by_subtype as Record<string, number>)?.unsafe_condition ?? 0)}
                positiveObservations={((dashboardData.by_subtype as Record<string, number>)?.safe_act ?? 0) + ((dashboardData.by_subtype as Record<string, number>)?.safe_condition ?? 0)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardLoading ? (
              <Card><CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
            ) : dashboardData ? (
              <PositiveObservationCard 
                data={dashboardData.by_subtype ? {
                  safe_act_count: (dashboardData.by_subtype as Record<string, number>)?.safe_act ?? 0,
                  safe_condition_count: (dashboardData.by_subtype as Record<string, number>)?.safe_condition ?? 0,
                  unsafe_act_count: (dashboardData.by_subtype as Record<string, number>)?.unsafe_act ?? 0,
                  unsafe_condition_count: (dashboardData.by_subtype as Record<string, number>)?.unsafe_condition ?? 0,
                } : null}
                isLoading={dashboardLoading}
              />
            ) : null}
            <ResidualRiskCard startDate={startDate} endDate={endDate} />
          </div>

          <ObservationTrendChart startDate={startDate} endDate={endDate} branchId={branchId || undefined} siteId={siteId || undefined} />
          
          <ObservationRatioBreakdown 
            startDate={startDate}
            endDate={endDate}
            branchId={branchId || undefined}
            siteId={siteId || undefined}
          />
        </DashboardSection>

        {/* ========== SECTION 8: Root Cause Analysis ========== */}
        <DashboardSection 
          title={t('hsseDashboard.rootCauseAnalysis', 'Root Cause Analysis')} 
          icon={GitBranch}
          defaultExpanded={false}
        >
          <RootCauseParetoChart 
            data={rcaData?.root_cause_distribution || []} 
            isLoading={rcaLoading} 
            dataUpdatedAt={rcaUpdatedAt}
            isFetching={rcaFetching}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RootCauseDistributionChart data={rcaData?.root_cause_distribution || []} isLoading={rcaLoading} />
            {rcaLoading ? (
              <Card><CardContent className="h-[400px] flex items-center justify-center"><Skeleton className="h-[350px] w-full" /></CardContent></Card>
            ) : rcaData ? (
              <CauseFlowDiagram data={rcaData.cause_flow} />
            ) : null}
          </div>
        </DashboardSection>

        {/* ========== SECTION 9: AI Insights ========== */}
        <DashboardSection 
          title={t('hsseDashboard.aiInsights', 'AI Insights')} 
          icon={Lightbulb}
          defaultExpanded={false}
          badge={
            <Badge variant="secondary" className="text-xs">AI</Badge>
          }
        >
          <EnhancedAIInsightsPanel 
            insights={insights} 
            isLoading={aiLoading} 
            onRefresh={handleGenerateAIInsights}
            lastUpdated={insights ? new Date() : undefined}
          />
        </DashboardSection>
        
        {/* Drilldown Modal */}
        <DrilldownModal />
      </div>
    </DrilldownProvider>
  );
}

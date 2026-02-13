import { useState, useRef, useCallback, useMemo, useEffect } from "react";
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
  BarChart3,
  Building2,
  MapPin,
  LineChart,
  PieChart,
  Eye,
  Flame,
  ArrowRightLeft,
  Calendar,
} from "lucide-react";
import { subDays, startOfMonth, endOfMonth, lastDayOfMonth, format } from "date-fns";
import { ar } from "date-fns/locale/ar";
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
import { useIncidentYears } from "@/hooks/use-incident-years";
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
  QuickActionsCard,
  RecentEventsCard,
  EnhancedKPIGrid,
  MajorEventsTimeline,
  BranchHeatmapGrid,
  SiteBubbleMap,
  TemporalHeatmap,
  DashboardExportDropdown,
  LiveUpdateIndicator,
  AutoRefreshToggle,
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
  CrossBranchSummaryCard,
  CrossBranchAnalytics,
  CrossBranchHeatmap,
  DrilldownModal,
} from "@/components/incidents/dashboard";
import { useHSSEAlerts } from "@/hooks/use-hsse-alerts";

export default function HSSEEventDashboard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  // --- Filter State ---
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [branchId, setBranchId] = useState<string>('');
  const [reporterBranchFilter, setReporterBranchFilter] = useState<string>('');
  const [locationBranchFilter, setLocationBranchFilter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const { data: branches } = useBranches();
  const { data: targets } = useKPITargets();
  const { data: availableYears, isLoading: yearsLoading } = useIncidentYears();

  // Set default year to latest available when data loads
  useEffect(() => {
    if (availableYears && availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  // Reset month when year changes
  const handleYearChange = (year: string) => {
    setSelectedYear(Number(year));
    setSelectedMonth('all');
  };

  // --- Compute unified date range from Year + Month ---
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const isCurrentYear = selectedYear === currentYear;

    if (selectedMonth === 'all') {
      const start = new Date(selectedYear, 0, 1);
      const end = isCurrentYear ? today : new Date(selectedYear, 11, 31);
      return { startDate: start, endDate: end };
    } else {
      const monthIdx = Number(selectedMonth);
      const start = new Date(selectedYear, monthIdx, 1);
      const monthEnd = lastDayOfMonth(start);
      const end = isCurrentYear && monthIdx >= currentMonth ? today : monthEnd;
      return { startDate: start, endDate: end };
    }
  }, [selectedYear, selectedMonth, currentYear, currentMonth]);

  // Format for hooks that accept string dates
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // --- Generate month options ---
  const monthOptions = useMemo(() => {
    const locale = isRTL ? ar : undefined;
    const options: { value: string; label: string; disabled: boolean }[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(selectedYear, i, 1);
      const label = format(date, 'MMMM', { locale });
      const disabled = selectedYear === currentYear && i > currentMonth;
      options.push({ value: String(i), label, disabled });
    }
    return options;
  }, [selectedYear, currentYear, currentMonth, isRTL]);

  // Event dashboard data - all use unified startDate/endDate
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard, dataUpdatedAt: dashboardUpdatedAt, isFetching: dashboardFetching } = useHSSEEventDashboard(startDate, endDate, branchId || undefined, undefined);
  const { data: locationData, isLoading: locationLoading, dataUpdatedAt: locationUpdatedAt, isFetching: locationFetching } = useEventsByLocation(startDate, endDate, branchId || undefined, undefined);
  const { data: reporters, isLoading: reportersLoading } = useTopReporters(10, startDate, endDate, branchId || undefined, undefined);
  const { generateInsights } = useHSSERiskAnalytics();
  const { data: rcaData, isLoading: rcaLoading, dataUpdatedAt: rcaUpdatedAt, isFetching: rcaFetching } = useRCAAnalytics(startDate, endDate, branchId || undefined, undefined);
  const { data: heatmapData, isLoading: heatmapLoading } = useLocationHeatmap(startDate, endDate, branchId || undefined, undefined);
  const { data: progressionData, isLoading: progressionLoading, dataUpdatedAt: progressionUpdatedAt, isFetching: progressionFetching } = useIncidentProgression(startDate, endDate, branchId || undefined, undefined);
  const { data: incidentTypeData, isLoading: incidentTypeLoading } = useIncidentTypeDistribution(startDate, endDate, branchId || undefined, undefined);

  // KPI data - all use same unified date range
  const { data: laggingData, isLoading: laggingLoading, refetch: refetchLagging } = useLaggingIndicators(startDateStr, endDateStr, branchId || undefined, undefined);
  const { data: leadingData, isLoading: leadingLoading, refetch: refetchLeading } = useLeadingIndicators(startDateStr, endDateStr, branchId || undefined, undefined);
  const { data: responseData, isLoading: responseLoading, refetch: refetchResponse } = useResponseMetrics(startDateStr, endDateStr, branchId || undefined, undefined);
  const { data: peopleData, isLoading: peopleLoading, refetch: refetchPeople } = usePeopleMetrics(startDateStr, endDateStr, branchId || undefined, undefined);
  const { data: daysSince, refetch: refetchDays } = useDaysSinceLastRecordable(branchId || undefined, undefined);

  // Trend data
  const { data: trendData, isLoading: trendLoading, refetch: refetchTrend } = useKPIHistoricalTrend(undefined, undefined, branchId || undefined, undefined);
  const { data: periodComparison, refetch: refetchComparison } = useKPIPeriodComparison('month', branchId || undefined, undefined);

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

  // Construct synthetic alert objects for the useHSSEAlerts hook
  const alertIncidents = useMemo(() => {
    if (!dashboardData) return [];
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
    const actions: any[] = [];
    const overdueCount = dashboardData.actions.overdue_actions ?? 0;
    const openCount = dashboardData.actions.open_actions ?? 0;
    for (let i = 0; i < overdueCount; i++) {
      actions.push({ status: 'open', due_date: subDays(new Date(), 1).toISOString() });
    }
    for (let i = 0; i < (openCount - overdueCount); i++) {
      actions.push({ status: 'open', due_date: new Date(Date.now() + 86400000).toISOString() });
    }
    return actions;
  }, [dashboardData]);

  useHSSEAlerts({
    incidents: alertIncidents,
    actions: alertActions,
    inspections: [],
  });

  const handleRefreshAndAcknowledge = () => {
    handleRefresh();
    acknowledgeEvents();
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

  // Month label for display
  const getMonthLabel = () => {
    if (selectedMonth === 'all') return t('common.allMonths', 'All Months');
    const monthIdx = Number(selectedMonth);
    const locale = isRTL ? ar : undefined;
    return format(new Date(selectedYear, monthIdx, 1), 'MMMM', { locale });
  };

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
            <DashboardExportDropdown
              dashboardRef={dashboardRef}
              dashboardData={dashboardData}
              locationData={locationData}
              rcaData={rcaData}
              startDate={startDate}
              endDate={endDate}
              branchName={branchId ? branches?.find(b => b.id === branchId)?.name : undefined}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth === 'all' ? undefined : getMonthLabel()}
              laggingData={laggingData ?? null}
              leadingData={leadingData ?? null}
              responseData={responseData ?? null}
              peopleData={peopleData ?? null}
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

        {/* ========== Unified Filter Bar ========== */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{t('kpiDashboard.filters', 'Filters')}:</span>

          {/* Year Selector */}
          <Select
            value={String(selectedYear)}
            onValueChange={handleYearChange}
            disabled={yearsLoading || !availableYears?.length}
          >
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue placeholder={t('common.year', 'Year')} />
            </SelectTrigger>
            <SelectContent>
              {(availableYears || [currentYear]).map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Selector */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder={t('common.allMonths', 'All Months')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allMonths', 'All Months')}</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch Selector */}
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

          {/* KPI Export */}
          <KPIDashboardExport
            laggingData={laggingData ?? null}
            leadingData={leadingData ?? null}
            responseData={responseData ?? null}
            peopleData={peopleData ?? null}
            dateRange={{ start: startDateStr, end: endDateStr }}
            filters={{
              branch: branchId ? branches?.find(b => b.id === branchId)?.name : undefined,
              year: selectedYear,
              month: selectedMonth === 'all' ? undefined : getMonthLabel(),
            }}
          />
        </div>

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
                  actionClosureRate={dashboardData.actions.total_actions > 0
                    ? Math.round((dashboardData.actions.actions_closed / dashboardData.actions.total_actions) * 100)
                    : 0}
                />
              ) : null}
            </div>

            {/* Days Since Counter */}
            <DaysSinceCounter
              days={daysSince ?? 999}
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
            periodLabel={getPeriodLabel('month')}
          />
          <KPITrendCard
            title="LTIFR"
            value={laggingData?.ltifr ?? 0}
            previousValue={periodComparison?.ltifr?.previous_value}
            sparklineData={getSparklineData('ltifr')}
            trend={periodComparison?.ltifr?.trend_direction as 'up' | 'down' | 'stable'}
            invertColors={true}
            isLoading={laggingLoading}
            periodLabel={getPeriodLabel('month')}
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
            periodLabel={getPeriodLabel('month')}
          />
          <KPITrendCard
            title={t('kpiDashboard.avgInvestigationDays', 'Avg Investigation')}
            value={responseData?.avg_investigation_days ?? 0}
            invertColors={true}
            suffix=" days"
            isLoading={responseLoading}
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
          <RecentEventsCard branchId={branchId || undefined} startDate={startDate} endDate={endDate} />
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

            {/* Safety KPIs Tab */}
            <TabsContent value="safety" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LaggingIndicatorsCard data={laggingData ?? null} isLoading={laggingLoading} />
                <LeadingIndicatorsCard data={leadingData ?? null} isLoading={leadingLoading} />
              </div>
            </TabsContent>

            {/* Operations Tab */}
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
                startDate={startDateStr}
                endDate={endDateStr}
                branchId={branchId || undefined}
                siteId={undefined}
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

          <ObservationTrendChart startDate={startDate} endDate={endDate} branchId={branchId || undefined} siteId={undefined} />

          <ObservationRatioBreakdown
            startDate={startDate}
            endDate={endDate}
            branchId={branchId || undefined}
            siteId={undefined}
          />
        </DashboardSection>

        {/* ========== SECTION 7.5: Cross-Branch Analytics ========== */}
        <DashboardSection
          title={t('hsseDashboard.crossBranchAnalytics', 'Cross-Branch Analytics')}
          icon={ArrowRightLeft}
          defaultExpanded={false}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <CrossBranchSummaryCard
              startDate={startDate}
              endDate={endDate}
            />
            <div className="lg:col-span-2">
              <CrossBranchAnalytics
                startDate={startDate}
                endDate={endDate}
                branchId={undefined}
                siteId={undefined}
                locationBranchId={locationBranchFilter}
                reporterBranchId={reporterBranchFilter}
                onLocationBranchChange={setLocationBranchFilter}
                onReporterBranchChange={setReporterBranchFilter}
              />
            </div>
          </div>
          <CrossBranchHeatmap
            startDate={startDate}
            endDate={endDate}
          />
        </DashboardSection>
      </div>
      <DrilldownModal />
    </DrilldownProvider>
  );
}

import React from "react";
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
} from '@/features/incidents';
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
  return (<div className="space-y-6">
    {/* ========== SECTION 1: Executive Summary (Always Visible) ========== */}<section className="space-y-4">
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
  );
}
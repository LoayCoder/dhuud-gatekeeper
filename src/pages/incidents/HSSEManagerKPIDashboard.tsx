import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, subMonths, startOfYear } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches } from '@/hooks/use-branches';
import { useSites } from '@/hooks/use-sites';
import {
  useLaggingIndicators,
  useLeadingIndicators,
  useResponseMetrics,
  usePeopleMetrics,
  useDaysSinceLastRecordable,
  useKPITargets,
  getKPIStatus,
} from '@/hooks/use-kpi-indicators';
import { useKPIHistoricalTrend, useKPIPeriodComparison, getPeriodLabel } from '@/hooks/use-kpi-trends';
import { LaggingIndicatorsCard } from '@/components/incidents/dashboard/LaggingIndicatorsCard';
import { LeadingIndicatorsCard } from '@/components/incidents/dashboard/LeadingIndicatorsCard';
import { ResponseMetricsCard } from '@/components/incidents/dashboard/ResponseMetricsCard';
import { PeopleMetricsCard } from '@/components/incidents/dashboard/PeopleMetricsCard';
import { DaysSinceCounter } from '@/components/incidents/dashboard/DaysSinceCounter';
import { KPIAlertsBanner } from '@/components/incidents/dashboard/KPIAlertsBanner';
import { IncidentMetricsCard } from '@/components/incidents/dashboard/IncidentMetricsCard';
import { KPIDashboardExport } from '@/components/incidents/dashboard/KPIDashboardExport';
import { KPITrendCard } from '@/components/incidents/dashboard/KPITrendCard';
import { KPIHistoricalTrendChart } from '@/components/incidents/dashboard/KPIHistoricalTrendChart';
import { TrendBadge } from '@/components/incidents/dashboard/TrendBadge';
import {
  Activity,
  TrendingUp,
  Clock,
  Users,
  BarChart3,
  Calendar,
  Building2,
  MapPin,
  RefreshCw,
  LineChart,
} from 'lucide-react';

type DateRange = 'week' | 'month' | '30days' | '90days' | 'ytd' | 'custom';

export default function HSSEManagerKPIDashboard() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [branchId, setBranchId] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');

  const { data: branches } = useBranches();
  const { data: sites } = useSites(branchId || undefined);
  const { data: targets } = useKPITargets();

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    let start: Date;
    const end = today;

    switch (dateRange) {
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
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  // Fetch KPI data
  const {
    data: laggingData,
    isLoading: laggingLoading,
    refetch: refetchLagging,
  } = useLaggingIndicators(startDate, endDate, branchId || undefined, siteId || undefined);

  const {
    data: leadingData,
    isLoading: leadingLoading,
    refetch: refetchLeading,
  } = useLeadingIndicators(startDate, endDate, branchId || undefined, siteId || undefined);

  const {
    data: responseData,
    isLoading: responseLoading,
    refetch: refetchResponse,
  } = useResponseMetrics(startDate, endDate, branchId || undefined, siteId || undefined);

  const {
    data: peopleData,
    isLoading: peopleLoading,
    refetch: refetchPeople,
  } = usePeopleMetrics(startDate, endDate, branchId || undefined, siteId || undefined);

  const { data: daysSince, refetch: refetchDays } = useDaysSinceLastRecordable(
    branchId || undefined,
    siteId || undefined
  );

  // Fetch trend data
  const periodForComparison = dateRange === 'week' ? 'week' : dateRange === '90days' ? '90days' : dateRange === 'ytd' ? 'ytd' : 'month';
  const { data: trendData, isLoading: trendLoading, refetch: refetchTrend } = useKPIHistoricalTrend(
    undefined,
    undefined,
    branchId || undefined,
    siteId || undefined
  );
  const { data: periodComparison, refetch: refetchComparison } = useKPIPeriodComparison(
    periodForComparison,
    branchId || undefined,
    siteId || undefined
  );

  const isLoading = laggingLoading || leadingLoading || responseLoading || peopleLoading || trendLoading;

  const handleRefresh = () => {
    refetchLagging();
    refetchLeading();
    refetchResponse();
    refetchPeople();
    refetchDays();
    refetchTrend();
    refetchComparison();
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
        kpiAlerts.push({
          code,
          label,
          value,
          threshold: target.warning_threshold,
          severity: 'warning',
        });
      } else if (status === 'critical') {
        kpiAlerts.push({
          code,
          label,
          value,
          threshold: target.critical_threshold,
          severity: 'critical',
        });
      }
    };

    checkKPI('trir', 'TRIR', laggingData.trir);
    checkKPI('ltifr', 'LTIFR', laggingData.ltifr);
    checkKPI('dart_rate', 'DART Rate', laggingData.dart_rate);
    checkKPI('severity_rate', 'Severity Rate', laggingData.severity_rate);

    return kpiAlerts;
  }, [laggingData, targets]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('kpiDashboard.title', 'HSSE Manager KPI Dashboard')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('kpiDashboard.subtitle', 'Key performance indicators and safety metrics')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="me-2 h-4 w-4" />
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

          {/* Branch Filter */}
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-[160px]">
              <Building2 className="me-2 h-4 w-4" />
              <SelectValue placeholder={t('common.allBranches', 'All Branches')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('common.allBranches', 'All Branches')}</SelectItem>
              {branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Site Filter */}
          <Select value={siteId} onValueChange={setSiteId} disabled={!branchId}>
            <SelectTrigger className="w-[160px]">
              <MapPin className="me-2 h-4 w-4" />
              <SelectValue placeholder={t('common.allSites', 'All Sites')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('common.allSites', 'All Sites')}</SelectItem>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export Button */}
          <KPIDashboardExport
            laggingData={laggingData ?? null}
            leadingData={leadingData ?? null}
            responseData={responseData ?? null}
            peopleData={peopleData ?? null}
            dateRange={{ start: startDate, end: endDate }}
          />
        </div>
      </div>

      {/* Alerts Banner */}
      <KPIAlertsBanner alerts={alerts} />

      {/* Days Since Counter + Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <DaysSinceCounter
          days={daysSince ?? 0}
          label={t('kpiDashboard.daysSinceRecordable', 'Days Since Last Recordable Injury')}
          milestone={100}
        />

        <div className="md:col-span-3 grid grid-cols-2 gap-3 md:grid-cols-4">
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
      </div>

      {/* Tabs */}
      <Tabs defaultValue="lagging" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:grid-cols-6">
          <TabsTrigger value="lagging" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('kpiDashboard.lagging', 'Lagging')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="leading" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('kpiDashboard.leading', 'Leading')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="response" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('kpiDashboard.response', 'Response')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('kpiDashboard.people', 'People')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('kpiDashboard.trends', 'Trends')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('kpiDashboard.metrics', 'Metrics')}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lagging">
          <LaggingIndicatorsCard data={laggingData ?? null} isLoading={laggingLoading} />
        </TabsContent>

        <TabsContent value="leading">
          <LeadingIndicatorsCard data={leadingData ?? null} isLoading={leadingLoading} />
        </TabsContent>

        <TabsContent value="response">
          <ResponseMetricsCard data={responseData ?? null} isLoading={responseLoading} />
        </TabsContent>

        <TabsContent value="people">
          <PeopleMetricsCard data={peopleData ?? null} isLoading={peopleLoading} />
        </TabsContent>

        <TabsContent value="trends">
          <KPIHistoricalTrendChart data={trendData || []} isLoading={trendLoading} />
        </TabsContent>

        <TabsContent value="metrics">
          <IncidentMetricsCard
            startDate={startDate}
            endDate={endDate}
            branchId={branchId || undefined}
            siteId={siteId || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

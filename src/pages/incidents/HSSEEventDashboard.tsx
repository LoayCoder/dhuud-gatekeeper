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
  TrendingDown
} from "lucide-react";
import { useHSSEEventDashboard } from "@/hooks/use-hsse-event-dashboard";
import { useEventsByLocation } from "@/hooks/use-events-by-location";
import { useTopReporters } from "@/hooks/use-top-reporters";
import { useHSSERiskAnalytics } from "@/hooks/use-hsse-risk-analytics";
import {
  EventTypeDistributionChart,
  SeverityDistributionChart,
  EventTrendChart,
  StatusDistributionChart,
  LocationAnalytics,
  ReporterLeaderboard,
  ActionsStatusWidget,
  AIInsightsPanel,
} from "@/components/incidents/dashboard";

function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendLabel,
  variant = 'default'
}: { 
  title: string; 
  value: number | string; 
  icon: any;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const bgClass = variant === 'danger' 
    ? 'bg-destructive/10 border-destructive/20' 
    : variant === 'warning' 
      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
      : 'bg-card';

  return (
    <Card className={bgClass}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
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
            'bg-primary/10'
          }`}>
            <Icon className={`h-5 w-5 ${
              variant === 'danger' ? 'text-destructive' : 
              variant === 'warning' ? 'text-yellow-600' : 
              'text-primary'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HSSEEventDashboard() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useHSSEEventDashboard();
  const { data: locationData, isLoading: locationLoading } = useEventsByLocation();
  const { data: reporters, isLoading: reportersLoading } = useTopReporters(10);
  const { insights, isLoading: aiLoading, generateInsights } = useHSSERiskAnalytics();

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchDashboard();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('hsseDashboard.title')}</h1>
          <p className="text-muted-foreground">{t('hsseDashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('hsseDashboard.refresh')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {dashboardLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : dashboardData ? (
          <>
            <KPICard
              title={t('hsseDashboard.totalEvents')}
              value={dashboardData.summary.total_events}
              icon={Calendar}
            />
            <KPICard
              title={t('hsseDashboard.openInvestigations')}
              value={dashboardData.summary.open_investigations}
              icon={Eye}
              variant={dashboardData.summary.open_investigations > 5 ? 'warning' : 'default'}
            />
            <KPICard
              title={t('hsseDashboard.pendingClosure')}
              value={dashboardData.summary.pending_closure}
              icon={ClipboardCheck}
              variant={dashboardData.summary.pending_closure > 3 ? 'warning' : 'default'}
            />
            <KPICard
              title={t('hsseDashboard.avgClosureDays')}
              value={dashboardData.summary.avg_closure_days || 0}
              icon={Clock}
            />
            <KPICard
              title={t('hsseDashboard.overdueActions')}
              value={dashboardData.actions.overdue_actions}
              icon={AlertTriangle}
              variant={dashboardData.actions.overdue_actions > 0 ? 'danger' : 'default'}
            />
          </>
        ) : null}
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

      {/* Monthly Trend */}
      <div className="grid grid-cols-1 gap-4">
        {dashboardLoading ? (
          <Card><CardContent className="h-[350px] flex items-center justify-center"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        ) : dashboardData ? (
          <EventTrendChart data={dashboardData.monthly_trend} />
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

      {/* Location Analytics & Reporter Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {locationLoading ? (
          <Card><CardContent className="h-[400px] flex items-center justify-center"><Skeleton className="h-[350px] w-full" /></CardContent></Card>
        ) : locationData ? (
          <LocationAnalytics data={locationData} />
        ) : null}

        {reportersLoading ? (
          <Card><CardContent className="h-[400px] flex items-center justify-center"><Skeleton className="h-[350px] w-full" /></CardContent></Card>
        ) : reporters ? (
          <ReporterLeaderboard reporters={reporters} />
        ) : null}
      </div>

      {/* AI Risk Insights */}
      <AIInsightsPanel 
        insights={insights} 
        isLoading={aiLoading} 
        onRefresh={handleGenerateAIInsights} 
      />
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Clock, Target, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseMetricsCardProps {
  data: {
    avg_investigation_days: number;
    within_target_pct: number;
    repeat_incident_rate: number;
    total_investigations: number;
    total_incidents: number;
  } | null;
  isLoading: boolean;
}

export function ResponseMetricsCard({ data, isLoading }: ResponseMetricsCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('kpiDashboard.responseMetrics', 'Response Metrics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const getInvestigationStatus = (days: number) => {
    if (days <= 7) return 'success';
    if (days <= 14) return 'warning';
    return 'critical';
  };

  const getRepeatStatus = (rate: number) => {
    if (rate <= 5) return 'success';
    if (rate <= 15) return 'warning';
    return 'critical';
  };

  const statusColors = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    critical: 'text-destructive',
  };

  const bgColors = {
    success: 'bg-emerald-500/10',
    warning: 'bg-amber-500/10',
    critical: 'bg-destructive/10',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {t('kpiDashboard.responseMetrics', 'Response Metrics')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Average Investigation Time */}
          <div
            className={cn(
              'rounded-lg p-4',
              bgColors[getInvestigationStatus(data.avg_investigation_days)]
            )}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t('kpiDashboard.avgInvestigationTime', 'Avg Investigation Time')}
              </span>
            </div>
            <div className="mt-2">
              <span
                className={cn(
                  'text-3xl font-bold',
                  statusColors[getInvestigationStatus(data.avg_investigation_days)]
                )}
              >
                {data.avg_investigation_days.toFixed(1)}
              </span>
              <span className="ms-1 text-sm text-muted-foreground">
                {t('kpiDashboard.days', 'days')}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.total_investigations} {t('kpiDashboard.investigations', 'investigations')}
            </p>
          </div>

          {/* Within Target */}
          <div className="rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t('kpiDashboard.withinTarget', 'Within Target (14 days)')}
              </span>
            </div>
            <div className="mt-2">
              <span
                className={cn(
                  'text-3xl font-bold',
                  data.within_target_pct >= 80
                    ? 'text-emerald-500'
                    : data.within_target_pct >= 60
                      ? 'text-amber-500'
                      : 'text-destructive'
                )}
              >
                {data.within_target_pct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2">
              <Progress value={data.within_target_pct} className="h-2" />
            </div>
          </div>

          {/* Repeat Incident Rate */}
          <div
            className={cn(
              'rounded-lg p-4',
              bgColors[getRepeatStatus(data.repeat_incident_rate)]
            )}
          >
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t('kpiDashboard.repeatIncidentRate', 'Repeat Incident Rate')}
              </span>
            </div>
            <div className="mt-2">
              <span
                className={cn(
                  'text-3xl font-bold',
                  statusColors[getRepeatStatus(data.repeat_incident_rate)]
                )}
              >
                {data.repeat_incident_rate.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('kpiDashboard.sameLocationWithin12Months', 'Same location within 12 months')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

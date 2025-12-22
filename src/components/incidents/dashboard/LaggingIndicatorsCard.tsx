import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KPIGaugeChart } from './KPIGaugeChart';
import { getKPIStatus, useKPITargets } from '@/hooks/use-kpi-indicators';
import { TrendingDown, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LaggingIndicatorsCardProps {
  data: {
    trir: number;
    ltifr: number;
    dart_rate: number;
    fatality_rate: number;
    severity_rate: number;
    total_recordable_injuries: number;
    lost_time_injuries: number;
    restricted_duty_cases: number;
    fatalities: number;
    total_lost_days: number;
    total_manhours: number;
  } | null;
  isLoading: boolean;
}

export function LaggingIndicatorsCard({ data, isLoading }: LaggingIndicatorsCardProps) {
  const { t } = useTranslation();
  const { data: targets } = useKPITargets();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('kpiDashboard.laggingIndicators', 'Lagging Indicators')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const getTarget = (code: string) => targets?.find((t) => t.kpi_code === code);

  const indicators = [
    {
      code: 'trir',
      label: t('kpiDashboard.trir', 'TRIR'),
      value: data.trir,
      maxValue: 10,
      tooltip: t('kpiDashboard.trirTooltip', 'Total Recordable Incident Rate per 200,000 hours'),
    },
    {
      code: 'ltifr',
      label: t('kpiDashboard.ltifr', 'LTIFR'),
      value: data.ltifr,
      maxValue: 5,
      tooltip: t('kpiDashboard.ltifrTooltip', 'Lost Time Injury Frequency Rate per 1,000,000 hours'),
    },
    {
      code: 'dart_rate',
      label: t('kpiDashboard.dartRate', 'DART'),
      value: data.dart_rate,
      maxValue: 5,
      tooltip: t('kpiDashboard.dartTooltip', 'Days Away, Restricted, or Transferred Rate'),
    },
    {
      code: 'severity_rate',
      label: t('kpiDashboard.severityRate', 'Severity'),
      value: data.severity_rate,
      maxValue: 100,
      tooltip: t('kpiDashboard.severityTooltip', 'Lost days per 200,000 hours worked'),
    },
    {
      code: 'fatality_rate',
      label: t('kpiDashboard.fatalityRate', 'Fatality'),
      value: data.fatality_rate,
      maxValue: 1,
      tooltip: t('kpiDashboard.fatalityTooltip', 'Fatalities per 100,000 workers'),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {t('kpiDashboard.laggingIndicators', 'Lagging Indicators')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gauge charts */}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
          <TooltipProvider>
            {indicators.map((indicator) => {
              const target = getTarget(indicator.code);
              const status = getKPIStatus(indicator.value, target);

              return (
                <Tooltip key={indicator.code}>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <KPIGaugeChart
                        value={indicator.value}
                        maxValue={indicator.maxValue}
                        label={indicator.label}
                        status={status}
                        size="md"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{indicator.tooltip}</p>
                    {target && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target: {'<'} {target.target_value}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-5">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.total_recordable_injuries}</p>
            <p className="text-xs text-muted-foreground">
              {t('kpiDashboard.recordableInjuries', 'Recordable Injuries')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.lost_time_injuries}</p>
            <p className="text-xs text-muted-foreground">
              {t('kpiDashboard.lostTimeInjuries', 'Lost Time Injuries')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.restricted_duty_cases}</p>
            <p className="text-xs text-muted-foreground">
              {t('kpiDashboard.restrictedDuty', 'Restricted Duty')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.total_lost_days}</p>
            <p className="text-xs text-muted-foreground">
              {t('kpiDashboard.totalLostDays', 'Total Lost Days')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {((data.total_manhours ?? 0) / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-muted-foreground">
              {t('kpiDashboard.manhours', 'Man-Hours')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

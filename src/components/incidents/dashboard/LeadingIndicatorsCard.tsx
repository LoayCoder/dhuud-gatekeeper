import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { getKPIStatus, useKPITargets } from '@/hooks/use-kpi-indicators';
import { TrendingUp, Eye, CheckCircle, AlertTriangle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadingIndicatorsCardProps {
  data: {
    near_miss_rate: number;
    observation_completion_pct: number;
    action_closure_pct: number;
    hazard_identification_rate: number;
    total_near_misses: number;
    total_observations: number;
    closed_observations: number;
    total_actions: number;
    closed_actions: number;
    total_hazards: number;
  } | null;
  isLoading: boolean;
}

export function LeadingIndicatorsCard({ data, isLoading }: LeadingIndicatorsCardProps) {
  const { t } = useTranslation();
  const { data: targets } = useKPITargets();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('kpiDashboard.leadingIndicators', 'Leading Indicators')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const getTarget = (code: string) => targets?.find((t) => t.kpi_code === code);

  const statusColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-destructive',
    neutral: 'bg-primary',
  };

  const indicators = [
    {
      code: 'near_miss_rate',
      label: t('kpiDashboard.nearMissRate', 'Near Miss Rate'),
      value: data.near_miss_rate ?? 0,
      count: data.total_near_misses ?? 0,
      countLabel: t('kpiDashboard.nearMisses', 'near misses'),
      icon: AlertTriangle,
      isPercentage: false,
      maxValue: 100,
    },
    {
      code: 'observation_completion',
      label: t('kpiDashboard.observationCompletion', 'Observation Completion'),
      value: data.observation_completion_pct ?? 0,
      count: `${data.closed_observations ?? 0}/${data.total_observations ?? 0}`,
      countLabel: t('kpiDashboard.completed', 'completed'),
      icon: Eye,
      isPercentage: true,
      maxValue: 100,
    },
    {
      code: 'action_closure',
      label: t('kpiDashboard.actionClosure', 'Action Closure Rate'),
      value: data.action_closure_pct ?? 0,
      count: `${data.closed_actions ?? 0}/${data.total_actions ?? 0}`,
      countLabel: t('kpiDashboard.closed', 'closed'),
      icon: CheckCircle,
      isPercentage: true,
      maxValue: 100,
    },
    {
      code: 'hazard_rate',
      label: t('kpiDashboard.hazardRate', 'Hazard Identification'),
      value: data.hazard_identification_rate ?? 0,
      count: data.total_hazards ?? 0,
      countLabel: t('kpiDashboard.hazardsIdentified', 'hazards identified'),
      icon: Target,
      isPercentage: false,
      maxValue: 100,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('kpiDashboard.leadingIndicators', 'Leading Indicators')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {indicators.map((indicator) => {
          const target = getTarget(indicator.code);
          const status = getKPIStatus(indicator.value, target);
          const Icon = indicator.icon;

          return (
            <div key={indicator.code} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{indicator.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {indicator.value.toFixed(1)}
                    {indicator.isPercentage && '%'}
                  </span>
                  {target && (
                    <span className="text-xs text-muted-foreground">
                      / {target.target_value}%
                    </span>
                  )}
                </div>
              </div>

              <div className="relative">
                <Progress
                  value={indicator.isPercentage ? indicator.value : Math.min((indicator.value / indicator.maxValue) * 100, 100)}
                  className="h-2"
                />
                <div
                  className={cn(
                    'absolute top-0 h-2 rounded-full transition-all',
                    statusColors[status]
                  )}
                  style={{
                    width: `${indicator.isPercentage ? indicator.value : Math.min((indicator.value / indicator.maxValue) * 100, 100)}%`,
                  }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {indicator.count} {indicator.countLabel}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

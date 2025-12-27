import { useTranslation } from 'react-i18next';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAssetHealthScore, useCalculateHealthScore } from '@/hooks/use-asset-health-scores';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AssetHealthScoreCardProps {
  assetId: string;
}

const RISK_COLORS = {
  low: 'bg-green-500/10 text-green-700 border-green-200',
  medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  high: 'bg-orange-500/10 text-orange-700 border-orange-200',
  critical: 'bg-red-500/10 text-red-700 border-red-200',
};

const TREND_ICONS = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
  critical_decline: AlertTriangle,
};

const TREND_COLORS = {
  improving: 'text-green-600',
  stable: 'text-muted-foreground',
  declining: 'text-orange-600',
  critical_decline: 'text-red-600',
};

export function AssetHealthScoreCard({ assetId }: AssetHealthScoreCardProps) {
  const { t } = useTranslation();
  const { data: healthScore, isLoading } = useAssetHealthScore(assetId);
  const calculateMutation = useCalculateHealthScore();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </CardContent>
      </Card>
    );
  }

  const handleCalculate = () => {
    calculateMutation.mutate(assetId);
  };

  if (!healthScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            {t('assets.health.title', 'Asset Health Score')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 space-y-4">
          <p className="text-muted-foreground">
            {t('assets.health.noScore', 'No health score calculated yet')}
          </p>
          <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
            <RefreshCw className={cn('h-4 w-4 me-2', calculateMutation.isPending && 'animate-spin')} />
            {t('assets.health.calculate', 'Calculate Health Score')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = TREND_ICONS[healthScore.trend || 'stable'];
  const factors = healthScore.contributing_factors as Record<string, number> || {};

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          {t('assets.health.title', 'Asset Health Score')}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleCalculate}
          disabled={calculateMutation.isPending}
        >
          <RefreshCw className={cn('h-4 w-4', calculateMutation.isPending && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score */}
        <div className="text-center">
          <div className={cn('text-5xl font-bold', getScoreColor(healthScore.score))}>
            {healthScore.score}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('assets.health.outOf100', 'out of 100')}
          </p>
          <div className="mt-3">
            <Progress 
              value={healthScore.score} 
              className="h-3"
              // @ts-ignore - custom styling
              indicatorClassName={getProgressColor(healthScore.score)}
            />
          </div>
        </div>

        {/* Risk Level & Trend */}
        <div className="flex items-center justify-center gap-4">
          <Badge 
            variant="outline" 
            className={cn(RISK_COLORS[healthScore.risk_level], 'text-sm py-1')}
          >
            {t(`assets.health.risk.${healthScore.risk_level}`, healthScore.risk_level)}
          </Badge>
          {healthScore.trend && (
            <div className={cn('flex items-center gap-1 text-sm', TREND_COLORS[healthScore.trend])}>
              <TrendIcon className="h-4 w-4" />
              {t(`assets.health.trend.${healthScore.trend}`, healthScore.trend)}
            </div>
          )}
        </div>

        {/* Failure Prediction */}
        {healthScore.failure_probability !== null && healthScore.failure_probability !== undefined && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('assets.health.failureProbability', 'Failure Probability')}</span>
              <span className={cn(
                'font-medium',
                healthScore.failure_probability > 70 ? 'text-red-600' : 
                healthScore.failure_probability > 40 ? 'text-orange-600' : 'text-green-600'
              )}>
                {healthScore.failure_probability.toFixed(1)}%
              </span>
            </div>
            {healthScore.days_until_predicted_failure && (
              <div className="flex justify-between text-sm">
                <span>{t('assets.health.daysUntilFailure', 'Est. Days Until Issue')}</span>
                <span className="font-medium">
                  {healthScore.days_until_predicted_failure} {t('common.days', 'days')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Contributing Factors */}
        {Object.keys(factors).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('assets.health.factors', 'Contributing Factors')}</h4>
            <div className="space-y-2">
              {Object.entries(factors).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">
                      {t(`assets.health.factor.${key}`, key.replace(/_/g, ' '))}
                    </span>
                    <span>{(value as number).toFixed(0)}%</span>
                  </div>
                  <Progress value={value as number} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Factor Scores */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {healthScore.maintenance_compliance_pct !== null && (
            <div className="p-2 rounded border">
              <p className="text-xs text-muted-foreground">{t('assets.health.maintenanceCompliance', 'Maintenance')}</p>
              <p className="font-medium">{healthScore.maintenance_compliance_pct?.toFixed(0)}%</p>
            </div>
          )}
          {healthScore.age_factor !== null && (
            <div className="p-2 rounded border">
              <p className="text-xs text-muted-foreground">{t('assets.health.ageFactor', 'Age Factor')}</p>
              <p className="font-medium">{healthScore.age_factor?.toFixed(0)}%</p>
            </div>
          )}
          {healthScore.condition_factor !== null && (
            <div className="p-2 rounded border">
              <p className="text-xs text-muted-foreground">{t('assets.health.conditionFactor', 'Condition')}</p>
              <p className="font-medium">{healthScore.condition_factor?.toFixed(0)}%</p>
            </div>
          )}
          {healthScore.usage_factor !== null && (
            <div className="p-2 rounded border">
              <p className="text-xs text-muted-foreground">{t('assets.health.usageFactor', 'Usage')}</p>
              <p className="font-medium">{healthScore.usage_factor?.toFixed(0)}%</p>
            </div>
          )}
        </div>

        {/* Last Calculated */}
        <p className="text-xs text-muted-foreground text-center">
          {t('assets.health.lastCalculated', 'Last calculated')}: {' '}
          {format(new Date(healthScore.last_calculated_at), 'dd/MM/yyyy HH:mm')}
        </p>
      </CardContent>
    </Card>
  );
}

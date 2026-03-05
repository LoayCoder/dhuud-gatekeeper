import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useResidualRiskMetrics } from '@/hooks/use-residual-risk';
import { TrendingDown, CheckCircle, MinusCircle, AlertCircle, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ResidualRiskCardProps {
  startDate?: Date;
  endDate?: Date;
}

export function ResidualRiskCard({ startDate, endDate }: ResidualRiskCardProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useResidualRiskMetrics({ startDate, endDate });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;
  const trendData = data?.monthly_trend || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-chart-3" />
          <div>
            <CardTitle>{t('residualRisk.title', 'Risk Reduction Metrics')}</CardTitle>
            <CardDescription>{t('residualRisk.subtitle', 'Tracking effectiveness of corrective actions')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-chart-3/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-chart-3" />
              <span className="text-2xl font-bold text-chart-3">{summary?.improved_count || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('residualRisk.improved', 'Improved')}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MinusCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{summary?.unchanged_count || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('residualRisk.unchanged', 'Unchanged')}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-destructive/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{summary?.worsened_count || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('residualRisk.worsened', 'Worsened')}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-primary">{summary?.avg_risk_reduction?.toFixed(1) || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('residualRisk.avgReduction', 'Avg Reduction')}</p>
          </div>
        </div>

        {/* Effectiveness Rate */}
        {summary && summary.total_assessed > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('residualRisk.effectivenessRate', 'Effectiveness Rate')}</span>
              <Badge variant={summary.effectiveness_rate && summary.effectiveness_rate >= 70 ? 'default' : 'secondary'}>
                {summary.effectiveness_rate?.toFixed(0) || 0}%
              </Badge>
            </div>
            <Progress value={summary.effectiveness_rate || 0} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {t('residualRisk.assessedActions', '{{count}} actions assessed', { count: summary.total_assessed })}
            </p>
          </div>
        )}

        {/* Trend Chart */}
        {trendData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">{t('residualRisk.monthlyTrend', 'Monthly Trend')}</h4>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avg_reduction" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-3))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By Initial Level */}
        {data?.by_initial_level && data.by_initial_level.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">{t('residualRisk.byInitialLevel', 'By Initial Risk Level')}</h4>
            <div className="space-y-2">
              {data.by_initial_level.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <Badge variant="outline">{t(`severity.${item.initial_risk_level}.label`, item.initial_risk_level)}</Badge>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{item.count} {t('common.actions')}</span>
                    <Badge variant="secondary">
                      {t('residualRisk.avgReduction')}: {item.avg_reduction?.toFixed(1) || 0}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

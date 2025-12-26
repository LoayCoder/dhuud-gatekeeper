import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { useObservationTrends } from '@/hooks/use-observation-trends';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ObservationTrendChartProps {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  siteId?: string;
}

export function ObservationTrendChart({ startDate, endDate, branchId, siteId }: ObservationTrendChartProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useObservationTrends({ startDate, endDate, branchId, siteId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.by_month?.map(item => ({
    ...item,
    ratio: item.negative > 0 ? (item.positive / item.negative).toFixed(2) : null,
  })) || [];

  const summary = data?.summary;
  const ratioTrend = chartData.length >= 2 
    ? Number(chartData[chartData.length - 1]?.ratio || 0) - Number(chartData[chartData.length - 2]?.ratio || 0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('observationTrends.title', 'Observation Trends')}</CardTitle>
            <CardDescription>{t('observationTrends.subtitle', 'Positive vs Negative observations over time')}</CardDescription>
          </div>
          {summary && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">{t('observationTrends.ratio', 'Ratio')}</p>
                <div className="flex items-center gap-1 font-semibold">
                  {ratioTrend > 0 ? (
                    <TrendingUp className="h-4 w-4 text-chart-3" />
                  ) : ratioTrend < 0 ? (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{summary.overall_ratio?.toFixed(2) || 'N/A'}:1</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {t('common.noData', 'No data available')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="positive" 
                name={t('observationTrends.positive', 'Positive')} 
                fill="hsl(var(--chart-3))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="left"
                dataKey="negative" 
                name={t('observationTrends.negative', 'Negative')} 
                fill="hsl(var(--destructive))" 
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ratio"
                name={t('observationTrends.ratio', 'Ratio')}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

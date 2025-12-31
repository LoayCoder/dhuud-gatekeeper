import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { TrendDataPoint } from '@/hooks/use-dept-rep-sla-analytics';

// HSSA color standards
const COLORS = {
  resolved: 'hsl(142, 76%, 36%)',   // Green
  overdue: 'hsl(0, 84%, 60%)',       // Red
  compliance: 'hsl(221, 83%, 53%)',  // Blue
};

interface DeptRepTrendChartProps {
  data?: TrendDataPoint[];
  isLoading?: boolean;
  period: 'week' | 'month';
  onPeriodChange: (period: 'week' | 'month') => void;
}

export function DeptRepTrendChart({ 
  data, 
  isLoading, 
  period, 
  onPeriodChange 
}: DeptRepTrendChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t('sla.resolutionTrends', 'Resolution Trends')}</CardTitle>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0 && data.some(d => d.resolved_count > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{t('sla.resolutionTrends', 'Resolution Trends')}</CardTitle>
        <ToggleGroup 
          type="single" 
          value={period} 
          onValueChange={(v) => v && onPeriodChange(v as 'week' | 'month')}
          size="sm"
        >
          <ToggleGroupItem value="week">{t('common.weekly', 'Weekly')}</ToggleGroupItem>
          <ToggleGroupItem value="month">{t('common.monthly', 'Monthly')}</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-muted-foreground">{t('common.noData', 'No data available')}</p>
          </div>
        ) : (
          <div className="h-[250px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.resolved} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.resolved} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.overdue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.overdue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="period_label" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => (
                    <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="resolved_count"
                  name={t('sla.resolved', 'Resolved')}
                  stroke={COLORS.resolved}
                  fill="url(#resolvedGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="overdue_count"
                  name={t('sla.overdue', 'Overdue')}
                  stroke={COLORS.overdue}
                  fill="url(#overdueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

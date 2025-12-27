import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import type { DepreciationSchedule } from '@/hooks/use-depreciation-schedules';

interface DepreciationChartProps {
  schedules: DepreciationSchedule[];
  currency?: string;
  salvageValue?: number;
}

export function DepreciationChart({ schedules, currency = 'SAR', salvageValue }: DepreciationChartProps) {
  const { t } = useTranslation();

  if (schedules.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  };

  const chartData = schedules.map((schedule, index) => ({
    period: format(new Date(schedule.period_start), 'MMM yy'),
    periodIndex: index + 1,
    bookValue: schedule.closing_value,
    depreciation: schedule.depreciation_amount,
    accumulated: schedule.accumulated_depreciation,
    isCurrent: new Date(schedule.period_start) <= new Date() && 
               new Date(schedule.period_end) >= new Date(),
  }));

  // Find current period index
  const currentPeriodIndex = chartData.findIndex(d => d.isCurrent);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDown className="h-4 w-4 text-destructive" />
          {t('assets.depreciation.valueOverTime', 'Asset Value Over Time')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bookValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="accumulatedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                width={60}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'bookValue' 
                    ? t('assets.depreciation.bookValue', 'Book Value')
                    : t('assets.depreciation.accumulated', 'Accumulated Depreciation'),
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              {salvageValue && (
                <ReferenceLine 
                  y={salvageValue} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: t('assets.depreciation.salvageValue', 'Salvage Value'),
                    position: 'insideTopRight',
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 11,
                  }}
                />
              )}
              {currentPeriodIndex >= 0 && (
                <ReferenceLine 
                  x={chartData[currentPeriodIndex]?.period} 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  label={{ 
                    value: t('assets.depreciation.today', 'Today'),
                    position: 'top',
                    fill: 'hsl(var(--primary))',
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="bookValue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#bookValueGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="accumulated"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                fill="url(#accumulatedGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">{t('assets.depreciation.bookValue', 'Book Value')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">{t('assets.depreciation.accumulated', 'Accumulated')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

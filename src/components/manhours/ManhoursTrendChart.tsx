import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useManhoursTrend } from '@/hooks/use-manhours-trend';
import { Loader2, TrendingUp } from 'lucide-react';

interface ManhoursTrendChartProps {
  branchId?: string;
  siteId?: string;
  months?: number;
}

export default function ManhoursTrendChart({ branchId, siteId, months = 12 }: ManhoursTrendChartProps) {
  const { t } = useTranslation();
  const { data: trendData, isLoading } = useManhoursTrend(months, branchId, siteId);

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('admin.manhours.trend', 'Manhours Trend')}
        </CardTitle>
        <CardDescription>
          {t('admin.manhours.trendDescription', 'Historical manhours trend over time')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month_label" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatNumber}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  name === 'employee_hours' 
                    ? t('admin.manhours.employeeHours', 'Employee Hours')
                    : name === 'contractor_hours'
                    ? t('admin.manhours.contractorHours', 'Contractor Hours')
                    : t('admin.manhours.totalHours', 'Total Hours')
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Legend 
                formatter={(value) => 
                  value === 'employee_hours' 
                    ? t('admin.manhours.employeeHours', 'Employee Hours')
                    : value === 'contractor_hours'
                    ? t('admin.manhours.contractorHours', 'Contractor Hours')
                    : t('admin.manhours.totalHours', 'Total Hours')
                }
              />
              <Line
                type="monotone"
                dataKey="employee_hours"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="contractor_hours"
                stroke="hsl(var(--warning, 38 92% 50%))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--warning, 38 92% 50%))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ComplianceStats } from '@/hooks/use-dept-rep-sla-analytics';

// HSSA color standards
const COLORS = {
  onTime: 'hsl(142, 76%, 36%)',    // Green - Safe
  overdue: 'hsl(0, 84%, 60%)',      // Red - Danger
  pending: 'hsl(45, 93%, 47%)',     // Amber - Warning
};

interface DeptRepComplianceChartProps {
  data?: ComplianceStats;
  isLoading?: boolean;
}

export function DeptRepComplianceChart({ data, isLoading }: DeptRepComplianceChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('sla.complianceOverview', 'SLA Compliance Overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('sla.complianceOverview', 'SLA Compliance Overview')}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-muted-foreground">{t('common.noData', 'No data available')}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: t('sla.onTime', 'On Time'), value: data.on_time, color: COLORS.onTime },
    { name: t('sla.overdue', 'Overdue'), value: data.overdue, color: COLORS.overdue },
    { name: t('sla.pending', 'Pending'), value: data.pending, color: COLORS.pending },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sla.complianceOverview', 'SLA Compliance Overview')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[250px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center compliance rate */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center" style={{ marginTop: '-20px' }}>
              <div className="text-3xl font-bold text-foreground">
                {data.compliance_rate}%
              </div>
              <div className="text-xs text-muted-foreground">
                {t('sla.compliance', 'Compliance')}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface SLAComplianceChartProps {
  data?: {
    on_time: number;
    overdue: number;
    total_with_due: number;
  };
}

export function SLAComplianceChart({ data }: SLAComplianceChartProps) {
  const { t } = useTranslation();

  if (!data || data.total_with_due === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        {t('analytics.noData', 'No data available')}
      </div>
    );
  }

  const chartData = [
    {
      name: t('analytics.onTime', 'On Time'),
      value: data.on_time,
      color: 'hsl(var(--success))',
    },
    {
      name: t('analytics.overdue', 'Overdue'),
      value: data.overdue,
      color: 'hsl(var(--destructive))',
    },
    {
      name: t('analytics.pending', 'Pending'),
      value: data.total_with_due - data.on_time - data.overdue,
      color: 'hsl(var(--warning))',
    },
  ].filter(item => item.value > 0);

  const complianceRate = data.total_with_due > 0 
    ? Math.round((data.on_time / data.total_with_due) * 100)
    : 0;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold">{complianceRate}%</div>
          <div className="text-xs text-muted-foreground">
            {t('analytics.compliance', 'Compliance')}
          </div>
        </div>
      </div>
    </div>
  );
}

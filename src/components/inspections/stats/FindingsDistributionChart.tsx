import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface FindingsDistributionChartProps {
  data: Array<{
    classification: string;
    count: number;
  }>;
}

const COLORS: Record<string, string> = {
  critical_nc: '#dc2626',
  major_nc: '#f97316',
  minor_nc: '#eab308',
  observation: '#3b82f6',
  ofi: '#22c55e',
};

export function FindingsDistributionChart({ data }: FindingsDistributionChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
        {t('inspectionDashboard.charts.noData')}
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: t(`inspectionDashboard.classifications.${item.classification}`),
    value: item.count,
    classification: item.classification,
  }));

  return (
    <div className="h-[250px]" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.classification] || '#94a3b8'} 
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [value, t('inspectionDashboard.charts.count')]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

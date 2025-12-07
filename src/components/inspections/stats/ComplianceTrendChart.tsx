import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ComplianceTrendChartProps {
  data: Array<{
    month: string;
    avg_compliance: number;
    session_count: number;
  }>;
}

export function ComplianceTrendChart({ data }: ComplianceTrendChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
        {t('inspectionDashboard.charts.noData')}
      </div>
    );
  }

  return (
    <div className="h-[250px]" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }} 
            className="fill-muted-foreground"
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [`${value}%`, t('inspectionDashboard.charts.compliance')]}
          />
          <Line
            type="monotone"
            dataKey="avg_compliance"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

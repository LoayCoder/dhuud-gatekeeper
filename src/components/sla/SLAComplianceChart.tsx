import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MonthlyComplianceData } from '@/hooks/use-sla-analytics';

interface SLAComplianceChartProps {
  data: MonthlyComplianceData[];
}

export function SLAComplianceChart({ data }: SLAComplianceChartProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('sla.complianceTrend', 'SLA Compliance Trend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="complianceRate"
                name={t('sla.complianceRate', 'Compliance Rate %')}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                name={t('sla.completedOnTime', 'Completed On Time')}
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(142, 76%, 36%)' }}
              />
              <Line
                type="monotone"
                dataKey="breached"
                name={t('sla.breached', 'Breached')}
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(0, 84%, 60%)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

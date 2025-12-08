import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";
import type { MonthlyTrendItem } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: MonthlyTrendItem[];
}

export function EventTrendChart({ data }: Props) {
  const { t } = useTranslation();

  const chartData = data.map(item => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
  }));

  if (data.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t('hsseDashboard.monthlyTrend')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          {t('hsseDashboard.noData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-base">{t('hsseDashboard.monthlyTrend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              name={t('hsseDashboard.totalEvents')}
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="incidents" 
              name={t('hsseDashboard.incidents')}
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="observations" 
              name={t('hsseDashboard.observations')}
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { StatusDistribution } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: StatusDistribution;
}

const STATUS_COLORS = {
  submitted: 'hsl(var(--chart-3))',
  investigation_in_progress: 'hsl(var(--chart-1))',
  pending_closure: 'hsl(var(--chart-4))',
  closed: 'hsl(var(--chart-5))',
};

export function StatusDistributionChart({ data }: Props) {
  const { t } = useTranslation();

  const chartData = [
    { name: t('status.submitted'), value: data.submitted, key: 'submitted' },
    { name: t('status.investigation_in_progress'), value: data.investigation_in_progress, key: 'investigation_in_progress' },
    { name: t('status.pending_closure'), value: data.pending_closure, key: 'pending_closure' },
    { name: t('status.closed'), value: data.closed, key: 'closed' },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('hsseDashboard.eventsByStatus')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
          {t('hsseDashboard.noData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('hsseDashboard.eventsByStatus')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="60%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key as keyof typeof STATUS_COLORS]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value, t('hsseDashboard.count')]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 text-sm">
            {chartData.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: STATUS_COLORS[item.key as keyof typeof STATUS_COLORS] }}
                />
                <span className="text-muted-foreground">{item.name}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

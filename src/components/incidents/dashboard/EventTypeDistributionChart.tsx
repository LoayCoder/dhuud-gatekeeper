import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardDrilldown } from "@/hooks/use-dashboard-drilldown";
import type { EventTypeDistribution } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: EventTypeDistribution;
}

const COLORS = {
  observation: 'hsl(var(--chart-1))',
  incident: 'hsl(var(--chart-2))',
  near_miss: 'hsl(var(--chart-3))',
  security_event: 'hsl(var(--chart-4))',
  environmental_event: 'hsl(var(--chart-5))',
};

export function EventTypeDistributionChart({ data }: Props) {
  const { t } = useTranslation();
  const { drillDown } = useDashboardDrilldown();

  const chartData = [
    { name: t('hsseDashboard.eventTypes.observation'), value: data.observation, key: 'observation' },
    { name: t('hsseDashboard.eventTypes.incident'), value: data.incident, key: 'incident' },
    { name: t('hsseDashboard.eventTypes.nearMiss'), value: data.near_miss, key: 'near_miss' },
    { name: t('hsseDashboard.eventTypes.securityEvent'), value: data.security_event, key: 'security_event' },
    { name: t('hsseDashboard.eventTypes.environmentalEvent'), value: data.environmental_event, key: 'environmental_event' },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const handleClick = (entry: { key: string }) => {
    drillDown({ eventType: entry.key });
  };

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('hsseDashboard.eventsByType')}</CardTitle>
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
        <CardTitle className="text-base">{t('hsseDashboard.eventsByType')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
              onClick={(_, index) => handleClick(chartData[index])}
              className="cursor-pointer"
            >
              {chartData.map((entry) => (
                <Cell 
                  key={entry.key} 
                  fill={COLORS[entry.key as keyof typeof COLORS]}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value, t('hsseDashboard.count')]}
            />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t('hsseDashboard.clickToFilter', 'Click to filter')}
        </p>
      </CardContent>
    </Card>
  );
}

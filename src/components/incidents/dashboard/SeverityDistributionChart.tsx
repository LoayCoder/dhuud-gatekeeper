import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useDashboardDrilldown } from "@/hooks/use-dashboard-drilldown";
import type { SeverityDistribution } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: SeverityDistribution;
}

// New 5-level severity colors
const SEVERITY_COLORS: Record<string, string> = {
  level_1: 'hsl(142 71% 45%)',  // Green - Low
  level_2: 'hsl(48 96% 53%)',   // Yellow - Moderate
  level_3: 'hsl(25 95% 53%)',   // Orange - Serious
  level_4: 'hsl(0 84% 60%)',    // Red - Major
  level_5: 'hsl(0 84% 40%)',    // Dark Red - Catastrophic
  // Legacy colors for backward compatibility
  critical: 'hsl(0 84% 60%)',
  high: 'hsl(25 95% 53%)',
  medium: 'hsl(48 96% 53%)',
  low: 'hsl(142 71% 45%)',
  unassigned: 'hsl(217 19% 55%)',
};

export function SeverityDistributionChart({ data }: Props) {
  const { t, i18n } = useTranslation();
  const { drillDown } = useDashboardDrilldown();
  const isRTL = i18n.dir() === 'rtl';

  // Support both old and new severity formats
  const chartData = [
    // New 5-level system
    { name: t('severity.level5.label'), value: (data as any).level_5 || 0, key: 'level_5' },
    { name: t('severity.level4.label'), value: (data as any).level_4 || 0, key: 'level_4' },
    { name: t('severity.level3.label'), value: (data as any).level_3 || 0, key: 'level_3' },
    { name: t('severity.level2.label'), value: (data as any).level_2 || 0, key: 'level_2' },
    { name: t('severity.level1.label'), value: (data as any).level_1 || 0, key: 'level_1' },
    // Legacy fallback
    { name: t('severity.critical'), value: data.critical || 0, key: 'critical' },
    { name: t('severity.high'), value: data.high || 0, key: 'high' },
    { name: t('severity.medium'), value: data.medium || 0, key: 'medium' },
    { name: t('severity.low'), value: data.low || 0, key: 'low' },
    { name: t('severity.unassigned', 'N/A'), value: data.unassigned || 0, key: 'unassigned' },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const handleClick = (entry: { key: string }) => {
    drillDown({ severity: entry.key });
  };

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('hsseDashboard.eventsBySeverity')}</CardTitle>
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
        <CardTitle className="text-base">{t('hsseDashboard.eventsBySeverity')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-chart-slide-up">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ left: isRTL ? 10 : 100, right: isRTL ? 100 : 10 }}
              onClick={(state) => {
                if (state?.activePayload?.[0]?.payload) {
                  handleClick(state.activePayload[0].payload);
                }
              }}
              className="cursor-pointer"
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={90}
                tick={{ fontSize: 11 }}
                orientation={isRTL ? 'right' : 'left'}
              />
              <Tooltip 
                formatter={(value: number) => [value, t('hsseDashboard.count')]}
              />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]} 
                className="cursor-pointer"
                isAnimationActive={true}
                animationDuration={600}
                animationBegin={150}
                animationEasing="ease-out"
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={entry.key} 
                    fill={SEVERITY_COLORS[entry.key] || SEVERITY_COLORS.unassigned}
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t('hsseDashboard.clickToFilter', 'Click to filter')}
        </p>
      </CardContent>
    </Card>
  );
}

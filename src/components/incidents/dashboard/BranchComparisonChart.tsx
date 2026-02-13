import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, LabelList,
} from "recharts";
import { Building2 } from "lucide-react";
import type { BranchEventData } from "@/hooks/use-events-by-location";

interface Props {
  data: BranchEventData[];
}

const METRIC_COLORS = {
  incidents: 'hsl(var(--chart-2))',
  observations: 'hsl(var(--chart-1))',
  investigations: 'hsl(var(--chart-4))',
};

export function BranchComparisonChart({ data }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('hsseDashboard.branchComparison', 'Branch Comparison')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          {t('hsseDashboard.noData')}
        </CardContent>
      </Card>
    );
  }

  // Sort by total events descending and take top 8
  const chartData = [...data]
    .sort((a, b) => b.total_events - a.total_events)
    .slice(0, 8)
    .map(branch => ({
      name: branch.branch_name,
      incidents: branch.incidents,
      observations: branch.observations,
      investigations: branch.open_investigations,
      total: branch.total_events,
    }));

  // Totals for header legend
  const totalIncidents = chartData.reduce((sum, b) => sum + b.incidents, 0);
  const totalObservations = chartData.reduce((sum, b) => sum + b.observations, 0);
  const totalInvestigations = chartData.reduce((sum, b) => sum + b.investigations, 0);

  // Dynamic Y-axis max with headroom for labels
  const maxVal = Math.max(
    ...chartData.flatMap(d => [d.incidents, d.observations, d.investigations]),
    1
  );
  const yMax = Math.ceil(maxVal * 1.2);

  // Dynamic chart height based on data count
  const chartHeight = Math.max(220, Math.min(300, chartData.length * 50));

  const legendItems = [
    { key: 'incidents', label: t('hsseDashboard.incidents', 'Incidents'), color: METRIC_COLORS.incidents, total: totalIncidents },
    { key: 'observations', label: t('hsseDashboard.observations', 'Observations'), color: METRIC_COLORS.observations, total: totalObservations },
    { key: 'investigations', label: t('hsseDashboard.investigations', 'Invest.'), color: METRIC_COLORS.investigations, total: totalInvestigations },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('hsseDashboard.branchComparison', 'Branch Comparison')}
          </CardTitle>
          {/* Inline compact legend - single location */}
          <div className="flex items-center gap-3 flex-wrap">
            {legendItems.map(item => (
              <div key={item.key} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-semibold tabular-nums" style={{ color: item.color }}>
                  {item.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="animate-chart-slide-up">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: isRTL ? 5 : 15, left: isRTL ? 15 : 5, bottom: 5 }}
              barCategoryGap="25%"
              barGap={2}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.4}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval={0}
                axisLine={false}
                tickLine={false}
                height={30}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                orientation={isRTL ? 'right' : 'left'}
                axisLine={false}
                tickLine={false}
                domain={[0, yMax]}
                allowDecimals={false}
                width={35}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 4 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    incidents: t('hsseDashboard.incidents', 'Incidents'),
                    observations: t('hsseDashboard.observations', 'Observations'),
                    investigations: t('hsseDashboard.investigations', 'Investigations'),
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Bar
                dataKey="incidents"
                fill={METRIC_COLORS.incidents}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={true}
                animationDuration={500}
                animationBegin={0}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="incidents"
                  position="top"
                  style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                  formatter={(v: number) => v > 0 ? v : ''}
                />
              </Bar>
              <Bar
                dataKey="observations"
                fill={METRIC_COLORS.observations}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={true}
                animationDuration={500}
                animationBegin={80}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="observations"
                  position="top"
                  style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                  formatter={(v: number) => v > 0 ? v : ''}
                />
              </Bar>
              <Bar
                dataKey="investigations"
                fill={METRIC_COLORS.investigations}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={true}
                animationDuration={500}
                animationBegin={160}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="investigations"
                  position="top"
                  style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                  formatter={(v: number) => v > 0 ? v : ''}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

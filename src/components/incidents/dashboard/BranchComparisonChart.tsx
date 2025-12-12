import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from "recharts";
import { Building2 } from "lucide-react";
import type { BranchEventData } from "@/hooks/use-events-by-location";

interface Props {
  data: BranchEventData[];
}

const METRIC_COLORS = {
  incidents: 'hsl(var(--chart-2))',
  observations: 'hsl(var(--chart-1))',
  open_investigations: 'hsl(var(--chart-4))',
  actions_overdue: 'hsl(var(--destructive))',
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
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
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
      name: branch.branch_name.length > 12 
        ? branch.branch_name.slice(0, 12) + '...' 
        : branch.branch_name,
      fullName: branch.branch_name,
      incidents: branch.incidents,
      observations: branch.observations,
      investigations: branch.open_investigations,
      overdue: branch.actions_overdue || 0,
      total: branch.total_events,
    }));

  // Calculate totals
  const totalIncidents = chartData.reduce((sum, b) => sum + b.incidents, 0);
  const totalObservations = chartData.reduce((sum, b) => sum + b.observations, 0);
  const totalOverdue = chartData.reduce((sum, b) => sum + b.overdue, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t('hsseDashboard.branchComparison', 'Branch Comparison')}
        </CardTitle>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METRIC_COLORS.incidents }} />
            <span className="text-muted-foreground">{t('hsseDashboard.incidents')}: {totalIncidents}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METRIC_COLORS.observations }} />
            <span className="text-muted-foreground">{t('hsseDashboard.observations')}: {totalObservations}</span>
          </div>
          {totalOverdue > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METRIC_COLORS.actions_overdue }} />
              <span className="text-destructive font-medium">{totalOverdue} {t('hsseDashboard.overdueStatus')}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-chart-slide-up">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: isRTL ? 10 : 20, left: isRTL ? 20 : 10, bottom: 60 }}
            >
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                orientation={isRTL ? 'right' : 'left'}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    incidents: t('hsseDashboard.incidents'),
                    observations: t('hsseDashboard.observations'),
                    investigations: t('hsseDashboard.investigations'),
                    overdue: t('hsseDashboard.overdueActions'),
                  };
                  return [value, labels[name] || name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    incidents: t('hsseDashboard.incidents'),
                    observations: t('hsseDashboard.observations'),
                    investigations: t('hsseDashboard.investigations'),
                    overdue: t('hsseDashboard.overdueActions'),
                  };
                  return labels[value] || value;
                }}
              />
              <Bar 
                dataKey="incidents" 
                fill={METRIC_COLORS.incidents}
                radius={[4, 4, 0, 0]}
                barSize={16}
                isAnimationActive={true}
                animationDuration={600}
                animationBegin={0}
                animationEasing="ease-out"
              />
              <Bar 
                dataKey="observations" 
                fill={METRIC_COLORS.observations}
                radius={[4, 4, 0, 0]}
                barSize={16}
                isAnimationActive={true}
                animationDuration={600}
                animationBegin={100}
                animationEasing="ease-out"
              />
              <Bar 
                dataKey="investigations" 
                fill={METRIC_COLORS.open_investigations}
                radius={[4, 4, 0, 0]}
                barSize={16}
                isAnimationActive={true}
                animationDuration={600}
                animationBegin={200}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardDrilldown } from "@/hooks/use-dashboard-drilldown";
import { formatStatusLabel } from "@/lib/incident-status-colors";
import type { StatusDistribution } from '@/features/incidents';

interface Props {
  data: StatusDistribution;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'hsl(217 91% 60%)',
  expert_screening: 'hsl(271 81% 56%)',
  pending_expert_screening: 'hsl(271 81% 56%)',
  pending_manager_approval: 'hsl(38 92% 50%)',
  pending_dept_rep_approval: 'hsl(33 90% 55%)',
  pending_dept_rep_incident_review: 'hsl(28 88% 52%)',
  pending_department_manager_approval: 'hsl(43 90% 48%)',
  pending_consultant_screening: 'hsl(280 70% 50%)',
  pending_consultant_review: 'hsl(285 65% 55%)',
  pending_hsse_validation: 'hsl(200 80% 50%)',
  pending_hsse_escalation_review: 'hsl(205 75% 48%)',
  pending_hsse_manager_closure: 'hsl(195 70% 52%)',
  under_investigation: 'hsl(199 89% 48%)',
  investigation_in_progress: 'hsl(199 89% 48%)',
  observation_actions_pending: 'hsl(45 80% 55%)',
  pending_final_closure: 'hsl(50 85% 50%)',
  pending_closure: 'hsl(45 93% 47%)',
  site_client_approval: 'hsl(160 60% 45%)',
  pending_legal_review: 'hsl(220 70% 55%)',
  pending_clinic_review: 'hsl(340 65% 55%)',
  dispute_open: 'hsl(15 80% 55%)',
  monitoring_30_day: 'hsl(170 60% 45%)',
  monitoring_60_day: 'hsl(175 60% 45%)',
  monitoring_90_day: 'hsl(180 60% 45%)',
  closed: 'hsl(142 71% 45%)',
  returned: 'hsl(24 95% 53%)',
  returned_to_reporter: 'hsl(24 95% 53%)',
  rejected: 'hsl(0 84% 60%)',
  rejected_invalid: 'hsl(0 84% 60%)',
};

// Fallback color generator for unknown statuses
const FALLBACK_COLORS = [
  'hsl(210 60% 55%)', 'hsl(260 55% 55%)', 'hsl(320 55% 55%)',
  'hsl(140 55% 50%)', 'hsl(80 55% 50%)', 'hsl(30 70% 55%)',
];

function getStatusColor(key: string, index: number): string {
  return STATUS_COLORS[key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function StatusDistributionChart({ data }: Props) {
  const { t } = useTranslation();
  const { drillDown } = useDashboardDrilldown();

  const dataRecord = data as Record<string, number>;
  
  // Dynamically build chart data from all statuses present in the data
  const chartData = Object.entries(dataRecord)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([key, value]) => ({
      name: t(`status.${key}`, formatStatusLabel(key)),
      value,
      key,
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const handleClick = (key: string) => {
    drillDown({ status: key });
  };

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
        <div className="flex items-center gap-4 animate-chart-fade-in">
          <ResponsiveContainer width="55%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                onClick={(_, index) => handleClick(chartData[index].key)}
                className="cursor-pointer"
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={100}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.key}
                    fill={getStatusColor(entry.key, index)}
                    className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value, t('hsseDashboard.count')]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 text-sm flex-1 max-h-[220px] overflow-y-auto">
            {chartData.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(0);
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                  onClick={() => handleClick(item.key)}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getStatusColor(item.key, index) }}
                  />
                  <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                  <span className="text-xs text-muted-foreground">({percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t('hsseDashboard.clickToFilter', 'Click to filter')}
        </p>
      </CardContent>
    </Card>
  );
}

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { StatusDistribution } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: StatusDistribution;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'hsl(217 91% 60%)',
  expert_screening: 'hsl(271 81% 56%)',
  pending_manager_approval: 'hsl(38 92% 50%)',
  investigation_in_progress: 'hsl(199 89% 48%)',
  pending_closure: 'hsl(45 93% 47%)',
  closed: 'hsl(142 71% 45%)',
  returned: 'hsl(24 95% 53%)',
  rejected: 'hsl(0 84% 60%)',
};

const STATUS_ORDER = [
  'submitted',
  'expert_screening', 
  'pending_manager_approval',
  'investigation_in_progress',
  'pending_closure',
  'closed',
  'returned',
  'rejected',
];

export function StatusDistributionChart({ data }: Props) {
  const { t } = useTranslation();

  const dataRecord = data as unknown as Record<string, number>;
  const chartData = STATUS_ORDER.map(key => ({
    name: t(`status.${key}`, key.replace(/_/g, ' ')),
    value: dataRecord[key] || 0,
    key,
  })).filter(item => item.value > 0);

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
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
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
          <div className="flex flex-col gap-1.5 text-sm flex-1">
            {chartData.map((item) => {
              const percentage = ((item.value / total) * 100).toFixed(0);
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: STATUS_COLORS[item.key] }}
                  />
                  <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                  <span className="text-xs text-muted-foreground">({percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

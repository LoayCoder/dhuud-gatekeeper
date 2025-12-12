import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ClipboardCheck } from "lucide-react";
import type { ActionStats } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: ActionStats;
}

const ACTION_STATUS_COLORS = {
  open: 'hsl(var(--chart-1))',
  closed: 'hsl(var(--chart-3))',
  overdue: 'hsl(var(--destructive))',
  pending_verification: 'hsl(var(--chart-4))',
};

export function CorrectiveActionDonutChart({ data }: Props) {
  const { t } = useTranslation();

  const chartData = [
    { 
      name: t('hsseDashboard.actionStatus.inProgress', 'In Progress'), 
      value: data.actions_in_progress || 0, 
      key: 'open' 
    },
    { 
      name: t('hsseDashboard.actionStatus.closed', 'Closed'), 
      value: data.actions_closed || 0, 
      key: 'closed' 
    },
    { 
      name: t('hsseDashboard.actionStatus.overdue', 'Overdue'), 
      value: data.overdue_actions || 0, 
      key: 'overdue' 
    },
    { 
      name: t('hsseDashboard.actionStatus.pendingVerification', 'Pending Verification'), 
      value: data.actions_pending_verification || 0, 
      key: 'pending_verification' 
    },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            {t('hsseDashboard.correctiveActionStatus', 'Corrective Action Status')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px] text-muted-foreground">
          {t('hsseDashboard.noData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          {t('hsseDashboard.correctiveActionStatus', 'Corrective Action Status')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 animate-chart-fade-in">
          <ResponsiveContainer width="55%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={2}
                stroke="hsl(var(--background))"
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={100}
                animationEasing="ease-out"
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={entry.key} 
                    fill={ACTION_STATUS_COLORS[entry.key as keyof typeof ACTION_STATUS_COLORS]}
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} (${((value / total) * 100).toFixed(0)}%)`, 
                  name
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 text-sm flex-1">
            <div className="text-center mb-2">
              <p className="text-3xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">{t('hsseDashboard.totalActions')}</p>
            </div>
            {chartData.map((item) => {
              const percentage = ((item.value / total) * 100).toFixed(0);
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: ACTION_STATUS_COLORS[item.key as keyof typeof ACTION_STATUS_COLORS] }}
                  />
                  <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                  <span className="text-xs text-muted-foreground w-10 text-end">({percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

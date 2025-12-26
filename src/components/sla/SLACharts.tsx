import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface SLADonutChartProps {
  stats: {
    onTrack: number;
    warning: number;
    overdue: number;
    escalatedLevel1: number;
    escalatedLevel2: number;
  };
}

const COLORS = {
  onTrack: 'hsl(142 76% 36%)', // green-600
  warning: 'hsl(48 96% 53%)',  // yellow-400
  overdue: 'hsl(25 95% 53%)',  // orange-500
  escalatedL1: 'hsl(0 84% 60%)', // red-500
  escalatedL2: 'hsl(0 72% 51%)', // red-600
};

export function SLADonutChart({ stats }: SLADonutChartProps) {
  const { t } = useTranslation();

  const data = [
    { name: t('sla.onTrack', 'On Track'), value: stats.onTrack, color: COLORS.onTrack },
    { name: t('sla.dueSoon', 'Due Soon'), value: stats.warning, color: COLORS.warning },
    { name: t('sla.overdue', 'Overdue'), value: stats.overdue, color: COLORS.overdue },
    { name: t('sla.escalatedL1', 'Escalated L1'), value: stats.escalatedLevel1, color: COLORS.escalatedL1 },
    { name: t('sla.escalatedL2', 'Escalated L2'), value: stats.escalatedLevel2, color: COLORS.escalatedL2 },
  ].filter(item => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        {t('sla.noData', 'No SLA data available')}
      </div>
    );
  }

  const chartConfig = {
    onTrack: { label: t('sla.onTrack', 'On Track'), color: COLORS.onTrack },
    warning: { label: t('sla.dueSoon', 'Due Soon'), color: COLORS.warning },
    overdue: { label: t('sla.overdue', 'Overdue'), color: COLORS.overdue },
    escalatedL1: { label: t('sla.escalatedL1', 'Escalated L1'), color: COLORS.escalatedL1 },
    escalatedL2: { label: t('sla.escalatedL2', 'Escalated L2'), color: COLORS.escalatedL2 },
  };

  return (
    <div className="h-[250px]" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const percentage = ((data.value / total) * 100).toFixed(1);
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="font-medium">{data.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {data.value} ({percentage}%)
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value, entry) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground">{t('common.total', 'Total')}</div>
        </div>
      </div>
    </div>
  );
}

interface PriorityBreakdownChartProps {
  data: {
    priority: string;
    onTrack: number;
    warning: number;
    overdue: number;
    escalated: number;
  }[];
}

export function PriorityBreakdownChart({ data }: PriorityBreakdownChartProps) {
  const { t } = useTranslation();

  const chartConfig = {
    onTrack: { label: t('sla.onTrack', 'On Track'), color: COLORS.onTrack },
    warning: { label: t('sla.dueSoon', 'Due Soon'), color: COLORS.warning },
    overdue: { label: t('sla.overdue', 'Overdue'), color: COLORS.overdue },
    escalated: { label: t('sla.escalated', 'Escalated'), color: COLORS.escalatedL1 },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {t('sla.byPriority', 'By Priority')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => {
            const total = item.onTrack + item.warning + item.overdue + item.escalated;
            if (total === 0) return null;

            return (
              <div key={item.priority} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{item.priority}</span>
                  <span className="text-muted-foreground">{total}</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {item.onTrack > 0 && (
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(item.onTrack / total) * 100}%` }} 
                    />
                  )}
                  {item.warning > 0 && (
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${(item.warning / total) * 100}%` }} 
                    />
                  )}
                  {item.overdue > 0 && (
                    <div 
                      className="bg-orange-500" 
                      style={{ width: `${(item.overdue / total) * 100}%` }} 
                    />
                  )}
                  {item.escalated > 0 && (
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(item.escalated / total) * 100}%` }} 
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

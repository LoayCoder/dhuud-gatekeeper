import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SLADonutChartProps {
  stats: {
    onTrack: number;
    warning: number;
    overdue: number;
    escalatedLevel1: number;
    escalatedLevel2: number;
  };
}

// Professional monochromatic palette with subtle variations
const COLORS = {
  onTrack: 'hsl(var(--muted-foreground))',
  warning: 'hsl(45 93% 47%)', // subtle yellow
  overdue: 'hsl(25 95% 53%)', // subtle orange
  escalatedL1: 'hsl(var(--destructive))',
  escalatedL2: 'hsl(0 72% 40%)', // darker red
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
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        {t('sla.noData', 'No SLA data available')}
      </div>
    );
  }

  return (
    <div className="h-[250px] relative" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            stroke="none"
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
                  <div className="bg-popover border rounded-md shadow-sm p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="font-medium">{data.name}</span>
                    </div>
                    <div className="text-muted-foreground mt-1">
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
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingInlineEnd: '100px' }}>
        <div className="text-center">
          <div className="text-2xl font-semibold">{total}</div>
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

  return (
    <Card className="border bg-card">
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
                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                  {item.onTrack > 0 && (
                    <div 
                      className="bg-muted-foreground/50" 
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
                      className="bg-destructive" 
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

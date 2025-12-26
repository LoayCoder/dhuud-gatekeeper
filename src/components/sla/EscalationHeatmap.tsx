import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { EscalationMetrics, PriorityMetrics } from '@/hooks/use-sla-analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface EscalationHeatmapProps {
  escalationMetrics: EscalationMetrics;
  priorityMetrics: PriorityMetrics[];
}

export function EscalationHeatmap({ escalationMetrics, priorityMetrics }: EscalationHeatmapProps) {
  const { t } = useTranslation();

  const escalationData = [
    { name: t('sla.noEscalation', 'No Escalation'), value: escalationMetrics.level0, color: 'hsl(142, 76%, 36%)' },
    { name: t('sla.level1', 'Level 1'), value: escalationMetrics.level1, color: 'hsl(38, 92%, 50%)' },
    { name: t('sla.level2', 'Level 2'), value: escalationMetrics.level2, color: 'hsl(0, 84%, 60%)' },
  ];

  const priorityColors: Record<string, string> = {
    critical: 'hsl(0, 84%, 60%)',
    high: 'hsl(25, 95%, 53%)',
    medium: 'hsl(38, 92%, 50%)',
    low: 'hsl(142, 76%, 36%)',
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('sla.escalationDistribution', 'Escalation Distribution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={escalationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {escalationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            {escalationData.map((item) => (
              <div key={item.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
            <span className="text-sm text-muted-foreground">{t('sla.escalationRate', 'Escalation Rate')}:</span>
            <span className={`ms-2 font-semibold ${escalationMetrics.escalationRate > 20 ? 'text-red-600' : 'text-green-600'}`}>
              {escalationMetrics.escalationRate}%
              {escalationMetrics.escalationRate > 20 ? (
                <TrendingDown className="inline w-4 h-4 ms-1" />
              ) : (
                <TrendingUp className="inline w-4 h-4 ms-1" />
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('sla.priorityBreakdown', 'Priority Breakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityMetrics} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs fill-muted-foreground" />
                <YAxis 
                  type="category" 
                  dataKey="priority" 
                  className="text-xs fill-muted-foreground capitalize"
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="total" name={t('sla.total', 'Total')}>
                  {priorityMetrics.map((entry) => (
                    <Cell key={entry.priority} fill={priorityColors[entry.priority] || 'hsl(var(--primary))'} />
                  ))}
                </Bar>
                <Bar dataKey="breached" name={t('sla.breached', 'Breached')} fill="hsl(0, 84%, 60%)" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

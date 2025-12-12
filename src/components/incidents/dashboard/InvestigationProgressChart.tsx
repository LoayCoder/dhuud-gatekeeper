import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Search } from "lucide-react";
import type { DashboardSummary } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: DashboardSummary;
}

const INVESTIGATION_COLORS = {
  assigned: 'hsl(var(--chart-1))',
  in_progress: 'hsl(var(--chart-2))',
  closed: 'hsl(var(--chart-3))',
  returned: 'hsl(var(--chart-5))',
};

export function InvestigationProgressChart({ data }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  // Calculate investigation stages from summary data
  const assignedCount = Math.max(0, (data.total_investigations || 0) - (data.investigations_open || 0) - (data.investigations_closed || 0));
  
  const chartData = [
    { 
      name: t('hsseDashboard.investigationStatus.assigned', 'Assigned'), 
      value: assignedCount,
      key: 'assigned' 
    },
    { 
      name: t('hsseDashboard.investigationStatus.inProgress', 'In Progress'), 
      value: data.investigations_open || 0, 
      key: 'in_progress' 
    },
    { 
      name: t('hsseDashboard.investigationStatus.closed', 'Closed'), 
      value: data.investigations_closed || 0, 
      key: 'closed' 
    },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t('hsseDashboard.investigationProgress', 'Investigation Progress')}
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" />
          {t('hsseDashboard.investigationProgress', 'Investigation Progress')}
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          {t('hsseDashboard.total')}: {total}
        </span>
      </CardHeader>
      <CardContent>
        <div className="animate-chart-slide-up">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ left: isRTL ? 10 : 100, right: isRTL ? 100 : 20, top: 10, bottom: 10 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={90}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                axisLine={false}
                tickLine={false}
                orientation={isRTL ? 'right' : 'left'}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} (${((value / total) * 100).toFixed(0)}%)`, 
                  t('hsseDashboard.investigations', 'Investigations')
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="value" 
                radius={[0, 6, 6, 0]}
                barSize={28}
                isAnimationActive={true}
                animationDuration={600}
                animationBegin={150}
                animationEasing="ease-out"
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={entry.key} 
                    fill={INVESTIGATION_COLORS[entry.key as keyof typeof INVESTIGATION_COLORS]}
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Progress indicators */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          {chartData.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: INVESTIGATION_COLORS[item.key as keyof typeof INVESTIGATION_COLORS] }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
              <span className="text-xs font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

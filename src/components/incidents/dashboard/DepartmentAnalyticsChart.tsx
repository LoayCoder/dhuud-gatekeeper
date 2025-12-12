import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Users, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import type { DepartmentEventData } from "@/hooks/use-events-by-location";

interface Props {
  data: DepartmentEventData[];
}

// Color scale for risk levels
const getRiskColor = (overdueRate: number): string => {
  if (overdueRate >= 50) return 'hsl(var(--destructive))';
  if (overdueRate >= 25) return 'hsl(25 95% 53%)'; // orange
  if (overdueRate >= 10) return 'hsl(48 96% 53%)'; // yellow
  return 'hsl(var(--chart-3))'; // green
};

const getRiskLevel = (overdueRate: number): string => {
  if (overdueRate >= 50) return 'critical';
  if (overdueRate >= 25) return 'high';
  if (overdueRate >= 10) return 'medium';
  return 'low';
};

export function DepartmentAnalyticsChart({ data }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('hsseDashboard.departmentAnalytics', 'Department Analytics')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          {t('hsseDashboard.noData')}
        </CardContent>
      </Card>
    );
  }

  // Process and sort by incidents descending
  const chartData = [...data]
    .map(dept => {
      const overdueRate = dept.total_actions > 0 
        ? Math.round((dept.actions_overdue / dept.total_actions) * 100) 
        : 0;
      const trend = dept.prev_total_events > 0 
        ? Math.round(((dept.total_events - dept.prev_total_events) / dept.prev_total_events) * 100) 
        : 0;
      
      return {
        name: dept.department_name.length > 15 
          ? dept.department_name.slice(0, 15) + '...' 
          : dept.department_name,
        fullName: dept.department_name,
        incidents: dept.incidents,
        observations: dept.observations || 0,
        total: dept.total_events,
        actions_open: dept.actions_open || 0,
        actions_overdue: dept.actions_overdue || 0,
        overdueRate,
        trend,
        riskColor: getRiskColor(overdueRate),
        riskLevel: getRiskLevel(overdueRate),
      };
    })
    .sort((a, b) => b.incidents - a.incidents)
    .slice(0, 10);

  // Calculate department with highest risk
  const highRiskDepts = chartData.filter(d => d.overdueRate >= 25);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('hsseDashboard.departmentAnalytics', 'Department Analytics')}
          </CardTitle>
          {highRiskDepts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 me-1" />
              {highRiskDepts.length} {t('hsseDashboard.highRiskDepts', 'High Risk')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Horizontal bar chart for incidents */}
        <div className="animate-chart-slide-up">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ left: isRTL ? 10 : 100, right: isRTL ? 100 : 20, top: 5, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={90}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                orientation={isRTL ? 'right' : 'left'}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value, t('hsseDashboard.incidents')]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
              />
              <Bar 
                dataKey="incidents" 
                radius={[0, 4, 4, 0]}
                barSize={18}
                isAnimationActive={true}
                animationDuration={600}
                animationBegin={150}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.riskColor} className="hover:opacity-80 transition-opacity duration-200" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Risk Summary */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            {t('hsseDashboard.actionOverdueRate', 'Action Overdue Rate by Department')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {chartData.slice(0, 6).map((dept) => (
              <div 
                key={dept.fullName} 
                className="p-2 rounded-lg bg-muted/50 flex items-center justify-between"
              >
                <span className="text-xs truncate flex-1">{dept.name}</span>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5"
                    style={{ 
                      borderColor: dept.riskColor,
                      color: dept.riskColor,
                    }}
                  >
                    {dept.overdueRate}%
                  </Badge>
                  {dept.trend !== 0 && (
                    dept.trend > 0 ? (
                      <TrendingUp className="h-3 w-3 text-destructive" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-green-600" />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

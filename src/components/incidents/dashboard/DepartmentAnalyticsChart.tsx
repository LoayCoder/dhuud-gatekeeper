import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
        name: dept.department_name,
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

  const maxIncidents = Math.max(...chartData.map(d => d.incidents), 1);

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
      <CardContent className="space-y-5">
        {/* Custom horizontal bar rows */}
        <TooltipProvider>
          <div className="space-y-3">
            {chartData.map((dept) => {
              const barWidth = Math.max((dept.incidents / maxIncidents) * 100, 2);
              return (
                <Tooltip key={dept.name}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 group cursor-default">
                      {/* Department name - fixed width, no truncation issues */}
                      <div 
                        className="shrink-0 text-xs text-muted-foreground text-end min-w-0"
                        style={{ width: '140px' }}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        <span className="block truncate" title={dept.name}>
                          {dept.name}
                        </span>
                      </div>

                      {/* Bar + count */}
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-500 ease-out group-hover:opacity-80"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: dept.riskColor,
                              minWidth: dept.incidents > 0 ? '4px' : '0px',
                            }}
                          />
                        </div>
                        <span 
                          className="text-xs font-semibold tabular-nums shrink-0"
                          style={{ color: dept.riskColor, minWidth: '24px' }}
                        >
                          {dept.incidents}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">{dept.name}</p>
                      <p>{t('hsseDashboard.incidents')}: {dept.incidents}</p>
                      <p>{t('hsseDashboard.observations', 'Observations')}: {dept.observations}</p>
                      <p>{t('hsseDashboard.openActions', 'Open Actions')}: {dept.actions_open}</p>
                      <p>{t('hsseDashboard.overdueActions', 'Overdue')}: {dept.actions_overdue}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Department Risk Summary */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium">
            {t('hsseDashboard.actionOverdueRate', 'Action Overdue Rate by Department')}
          </p>
          <div className="space-y-2">
            {chartData.slice(0, 6).map((dept) => (
              <div 
                key={dept.name} 
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
              >
                {/* Department name */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className="text-xs truncate shrink-0"
                        style={{ width: '140px' }}
                        title={dept.name}
                      >
                        {dept.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {dept.name}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Overdue rate bar */}
                <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(dept.overdueRate, dept.overdueRate > 0 ? 3 : 0)}%`,
                      backgroundColor: dept.riskColor,
                    }}
                  />
                </div>

                {/* Rate + trend */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 tabular-nums"
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
                      <TrendingDown className="h-3 w-3" style={{ color: 'hsl(var(--chart-3))' }} />
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

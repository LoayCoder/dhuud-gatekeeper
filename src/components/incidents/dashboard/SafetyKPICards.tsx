import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, TrendingUp, TrendingDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DashboardSummary, ActionStats } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  summary: DashboardSummary;
  actions: ActionStats;
  // Optional: man-hours and lost days for LTI/TRIR calculation
  totalManHours?: number;
  lostWorkDays?: number;
  recordableIncidents?: number;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  tooltip?: string;
}

function SafetyKPICard({ title, value, subtitle, trend, variant = 'default', tooltip }: KPICardProps) {
  const bgClass = variant === 'danger' 
    ? 'bg-destructive/10 border-destructive/20' 
    : variant === 'warning' 
      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
      : variant === 'success'
        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
        : 'bg-muted/50';

  return (
    <div className={`p-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={`text-2xl font-bold mt-1 ${
            variant === 'danger' ? 'text-destructive' : 
            variant === 'success' ? 'text-green-600 dark:text-green-400' :
            variant === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : ''
          }`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs ${
            trend > 0 ? 'text-destructive' : 'text-green-600'
          }`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SafetyKPICards({ summary, actions, totalManHours, lostWorkDays, recordableIncidents }: Props) {
  const { t } = useTranslation();

  // Calculate Safety KPIs
  // Closure Rate: % of events closed vs total
  const totalEvents = summary.total_events || 0;
  const closedEvents = (summary.incidents_closed || 0) + (summary.observations_closed || 0);
  const closureRate = totalEvents > 0 ? Math.round((closedEvents / totalEvents) * 100) : 0;

  // Investigation Completion Rate
  const totalInvestigations = summary.total_investigations || 0;
  const closedInvestigations = summary.investigations_closed || 0;
  const investigationRate = totalInvestigations > 0 
    ? Math.round((closedInvestigations / totalInvestigations) * 100) 
    : 0;

  // Action Completion Rate
  const totalActions = actions.total_actions || 0;
  const closedActions = actions.actions_closed || 0;
  const actionRate = totalActions > 0 ? Math.round((closedActions / totalActions) * 100) : 0;

  // Overdue Rate (inverse - lower is better)
  const overdueRate = actions.open_actions > 0 
    ? Math.round((actions.overdue_actions / actions.open_actions) * 100) 
    : 0;

  // Calculate LTI Rate (Lost Time Injury Rate) if data provided
  // Formula: (Lost Time Injuries × 200,000) / Total Man-Hours
  const ltiRate = totalManHours && totalManHours > 0 && lostWorkDays !== undefined
    ? ((summary.incidents_closed || 1) * 200000 / totalManHours).toFixed(2)
    : null;

  // Calculate TRIR (Total Recordable Incident Rate) if data provided
  // Formula: (Recordable Incidents × 200,000) / Total Man-Hours
  const trirRate = totalManHours && totalManHours > 0 && recordableIncidents !== undefined
    ? ((recordableIncidents * 200000) / totalManHours).toFixed(2)
    : null;

  // Determine variant based on rates
  const getClosureVariant = (rate: number) => {
    if (rate >= 80) return 'success';
    if (rate >= 50) return 'warning';
    return 'danger';
  };

  const getOverdueVariant = (rate: number) => {
    if (rate <= 10) return 'success';
    if (rate <= 25) return 'warning';
    return 'danger';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t('hsseDashboard.safetyKPIs', 'Safety Performance Indicators')}
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {t('hsseDashboard.kpiPeriod', 'Current Period')}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SafetyKPICard
            title={t('hsseDashboard.closureRate', 'Event Closure Rate')}
            value={`${closureRate}%`}
            subtitle={`${closedEvents}/${totalEvents} ${t('hsseDashboard.events')}`}
            variant={getClosureVariant(closureRate)}
            tooltip={t('hsseDashboard.closureRateTooltip', 'Percentage of events that have been closed')}
          />
          
          <SafetyKPICard
            title={t('hsseDashboard.investigationRate', 'Investigation Rate')}
            value={`${investigationRate}%`}
            subtitle={`${closedInvestigations}/${totalInvestigations}`}
            variant={getClosureVariant(investigationRate)}
            tooltip={t('hsseDashboard.investigationRateTooltip', 'Percentage of investigations completed')}
          />
          
          <SafetyKPICard
            title={t('hsseDashboard.actionCompletionRate', 'Action Completion')}
            value={`${actionRate}%`}
            subtitle={`${closedActions}/${totalActions} ${t('hsseDashboard.actions')}`}
            variant={getClosureVariant(actionRate)}
            tooltip={t('hsseDashboard.actionRateTooltip', 'Percentage of corrective actions completed')}
          />
          
          <SafetyKPICard
            title={t('hsseDashboard.overdueRate', 'Overdue Rate')}
            value={`${overdueRate}%`}
            subtitle={`${actions.overdue_actions} ${t('hsseDashboard.overdueActions')}`}
            variant={getOverdueVariant(overdueRate)}
            tooltip={t('hsseDashboard.overdueRateTooltip', 'Percentage of open actions that are overdue')}
          />
        </div>

        {/* Progress Bars */}
        <div className="space-y-3 pt-2 border-t">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{t('hsseDashboard.closureProgress', 'Overall Closure Progress')}</span>
              <span className="font-medium">{closureRate}%</span>
            </div>
            <Progress value={closureRate} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{t('hsseDashboard.actionProgress', 'Action Completion Progress')}</span>
              <span className="font-medium">{actionRate}%</span>
            </div>
            <Progress value={actionRate} className="h-2" />
          </div>
        </div>

        {/* LTI/TRIR Section (if data available) */}
        {(ltiRate || trirRate) && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              {t('hsseDashboard.laggingIndicators', 'Lagging Safety Indicators')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ltiRate && (
                <SafetyKPICard
                  title={t('hsseDashboard.ltiRate', 'LTI Rate')}
                  value={ltiRate}
                  tooltip={t('hsseDashboard.ltiTooltip', 'Lost Time Injury Rate per 200,000 man-hours')}
                />
              )}
              {trirRate && (
                <SafetyKPICard
                  title={t('hsseDashboard.trirRate', 'TRIR')}
                  value={trirRate}
                  tooltip={t('hsseDashboard.trirTooltip', 'Total Recordable Incident Rate per 200,000 man-hours')}
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSummary, ActionStats } from "@/hooks/use-hsse-event-dashboard";

interface ExecutiveSummaryCardProps {
  summary: DashboardSummary;
  actions: ActionStats;
  trir?: number;
  ltifr?: number;
  actionClosureRate?: number;
}

type RAGStatus = 'green' | 'amber' | 'red';

function getOverallSafetyScore(
  summary: DashboardSummary,
  actions: ActionStats,
  trir?: number,
  ltifr?: number
): { score: number; status: RAGStatus; priorities: string[] } {
  let score = 100;
  const priorities: string[] = [];

  // Deduct points for overdue actions (major issue)
  const overdueRate = actions.open_actions > 0 
    ? (actions.overdue_actions / actions.open_actions) * 100 
    : 0;
  if (overdueRate > 25) {
    score -= 30;
    priorities.push('overdue_actions');
  } else if (overdueRate > 10) {
    score -= 15;
  }

  // Deduct points for open incidents (Level 4-5)
  if (summary.incidents_overdue && summary.incidents_overdue > 0) {
    score -= Math.min(summary.incidents_overdue * 5, 20);
    priorities.push('overdue_incidents');
  }

  // Deduct points for open investigations
  const openInvestigations = summary.investigations_open || 0;
  if (openInvestigations > 5) {
    score -= 15;
    priorities.push('open_investigations');
  } else if (openInvestigations > 0) {
    score -= 5;
  }

  // Deduct points based on TRIR if available
  if (trir !== undefined) {
    if (trir > 5) {
      score -= 20;
      priorities.push('high_trir');
    } else if (trir > 2) {
      score -= 10;
    }
  }

  // Deduct points based on LTIFR if available
  if (ltifr !== undefined) {
    if (ltifr > 2) {
      score -= 15;
      priorities.push('high_ltifr');
    } else if (ltifr > 1) {
      score -= 5;
    }
  }

  // Bonus for high closure rates
  const closureRate = summary.total_events > 0
    ? ((summary.incidents_closed || 0) + (summary.observations_closed || 0)) / summary.total_events * 100
    : 100;
  if (closureRate >= 90) {
    score += 10;
  }

  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine RAG status
  let status: RAGStatus = 'green';
  if (score < 50) {
    status = 'red';
  } else if (score < 75) {
    status = 'amber';
  }

  return { score, status, priorities: priorities.slice(0, 3) };
}

export function ExecutiveSummaryCard({ 
  summary, 
  actions,
  trir,
  ltifr,
  actionClosureRate,
}: ExecutiveSummaryCardProps) {
  const { t } = useTranslation();
  
  const { score, status, priorities } = getOverallSafetyScore(summary, actions, trir, ltifr);

  const priorityLabels: Record<string, { label: string; icon: typeof AlertTriangle }> = {
    overdue_actions: { 
      label: t('executiveSummary.overdueActions', 'Overdue corrective actions require attention'),
      icon: XCircle 
    },
    overdue_incidents: { 
      label: t('executiveSummary.overdueIncidents', 'Overdue incident investigations'),
      icon: AlertTriangle 
    },
    open_investigations: { 
      label: t('executiveSummary.openInvestigations', 'Multiple open investigations'),
      icon: Activity 
    },
    high_trir: { 
      label: t('executiveSummary.highTrir', 'TRIR above target threshold'),
      icon: TrendingUp 
    },
    high_ltifr: { 
      label: t('executiveSummary.highLtifr', 'LTIFR above target threshold'),
      icon: TrendingUp 
    },
  };

  const statusColors = {
    green: 'bg-success',
    amber: 'bg-warning',
    red: 'bg-destructive',
  };

  const statusBgColors = {
    green: 'bg-success/10 border-success/30',
    amber: 'bg-warning/10 border-warning/30',
    red: 'bg-destructive/10 border-destructive/30',
  };

  const statusLabels = {
    green: t('executiveSummary.statusGood', 'Good'),
    amber: t('executiveSummary.statusCaution', 'Caution'),
    red: t('executiveSummary.statusCritical', 'Critical'),
  };

  return (
    <Card className={cn("border-2", statusBgColors[status])}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('executiveSummary.title', 'Safety Overview')}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "font-semibold",
              status === 'green' && "border-success text-success",
              status === 'amber' && "border-warning text-warning",
              status === 'red' && "border-destructive text-destructive"
            )}
          >
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Safety Score Gauge */}
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full border-8 border-muted flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  className={cn("transition-all duration-500", statusColors[status])}
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="38"
                  cx="48"
                  cy="48"
                  style={{
                    strokeDasharray: `${score * 2.39} 239`,
                  }}
                />
              </svg>
              <span className="text-2xl font-bold">{score}</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('executiveSummary.overallScore', 'Overall Safety Score')}</span>
              <span className="font-medium">{score}/100</span>
            </div>
            <Progress 
              value={score} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {status === 'green' && t('executiveSummary.scoreGoodMsg', 'Safety performance is within acceptable limits')}
              {status === 'amber' && t('executiveSummary.scoreCautionMsg', 'Some areas require attention')}
              {status === 'red' && t('executiveSummary.scoreCriticalMsg', 'Immediate action required')}
            </p>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-4 gap-3 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-bold">{summary.total_events}</p>
            <p className="text-xs text-muted-foreground">{t('hsseDashboard.totalEvents', 'Total Events')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{summary.open_investigations || 0}</p>
            <p className="text-xs text-muted-foreground">{t('hsseDashboard.openInvestigations', 'Open Investigations')}</p>
          </div>
          <div className="text-center">
            <p className={cn(
              "text-lg font-bold",
              actions.overdue_actions > 0 && "text-destructive"
            )}>
              {actions.overdue_actions}
            </p>
            <p className="text-xs text-muted-foreground">{t('hsseDashboard.overdueActions', 'Overdue Actions')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{actionClosureRate ?? 0}%</p>
            <p className="text-xs text-muted-foreground">{t('kpiDashboard.actionClosure', 'Action Closure')}</p>
          </div>
        </div>

        {/* Top Priorities */}
        {priorities.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('executiveSummary.topPriorities', 'Top Priorities')}
            </p>
            {priorities.map((priority) => {
              const { label, icon: PriorityIcon } = priorityLabels[priority] || { 
                label: priority, 
                icon: AlertTriangle 
              };
              return (
                <div key={priority} className="flex items-center gap-2 text-sm">
                  <PriorityIcon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    status === 'red' ? "text-destructive" : "text-amber-500"
                  )} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* All Clear Message */}
        {priorities.length === 0 && status === 'green' && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('executiveSummary.allClear', 'No critical issues. Safety performance is on track.')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { OverallSummary } from "@/hooks/use-kpi-evaluation";
import { cn } from "@/lib/utils";

interface KPIPerformanceSummaryProps {
  summary: OverallSummary | null;
  isLoading?: boolean;
}

export function KPIPerformanceSummary({ summary, isLoading }: KPIPerformanceSummaryProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const statusCards = [
    {
      label: t('kpiAdmin.exceeding', 'Exceeding'),
      count: summary.exceeding_count,
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: t('kpiAdmin.onTrack', 'On Track'),
      count: summary.on_track_count,
      icon: CheckCircle2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: t('kpiAdmin.atRisk', 'At Risk'),
      count: summary.at_risk_count,
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      label: t('kpiAdmin.failing', 'Failing'),
      count: summary.failing_count,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t('kpiAdmin.performanceSummary', 'KPI Performance Summary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={cn(
                  "rounded-lg p-4 text-center",
                  card.bg
                )}
              >
                <Icon className={cn("h-6 w-6 mx-auto mb-2", card.color)} />
                <div className={cn("text-2xl font-bold", card.color)}>
                  {card.count}
                </div>
                <div className="text-sm text-muted-foreground">{card.label}</div>
              </div>
            );
          })}
        </div>

        {/* Narrative */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {summary.performance_narrative}
          </p>
        </div>

        {/* Top Priority Actions */}
        {summary.top_priority_actions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              {t('kpiAdmin.topPriorityActions', 'Top Priority Actions')}
            </h4>
            <ul className="space-y-2">
              {summary.top_priority_actions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0">
                    {idx + 1}
                  </Badge>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

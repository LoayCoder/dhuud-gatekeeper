import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, TrendingUp, TrendingDown, Lightbulb, Target } from "lucide-react";
import { KPIEvaluation } from "@/hooks/use-kpi-evaluation";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface KPIEvaluationPanelProps {
  evaluations: KPIEvaluation[];
  isLoading?: boolean;
}

const statusConfig = {
  'exceeding': { 
    label: 'Exceeding', 
    color: 'text-green-500', 
    bg: 'bg-green-500/10',
    badge: 'default' as const,
    progressColor: 'bg-green-500'
  },
  'on-track': { 
    label: 'On Track', 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10',
    badge: 'secondary' as const,
    progressColor: 'bg-blue-500'
  },
  'at-risk': { 
    label: 'At Risk', 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/10',
    badge: 'outline' as const,
    progressColor: 'bg-yellow-500'
  },
  'failing': { 
    label: 'Failing', 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    badge: 'destructive' as const,
    progressColor: 'bg-destructive'
  },
};

export function KPIEvaluationPanel({ evaluations, isLoading }: KPIEvaluationPanelProps) {
  const { t } = useTranslation();
  const [expandedKPIs, setExpandedKPIs] = useState<Set<string>>(new Set());

  const toggleExpanded = (kpiCode: string) => {
    setExpandedKPIs(prev => {
      const next = new Set(prev);
      if (next.has(kpiCode)) {
        next.delete(kpiCode);
      } else {
        next.add(kpiCode);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('kpiAdmin.aiEvaluation', 'AI Evaluation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (evaluations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {t('kpiAdmin.aiEvaluation', 'AI KPI Evaluation')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {evaluations.map((evaluation) => {
          const config = statusConfig[evaluation.status] || statusConfig['on-track'];
          const isExpanded = expandedKPIs.has(evaluation.kpi_code);
          const progressValue = Math.min(evaluation.performance_percentage, 150);

          return (
            <Collapsible
              key={evaluation.kpi_code}
              open={isExpanded}
              onOpenChange={() => toggleExpanded(evaluation.kpi_code)}
            >
              <div className={cn("rounded-lg border p-4", config.bg)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("font-mono text-sm px-2 py-1 rounded", config.bg, config.color)}>
                        {evaluation.kpi_code}
                      </div>
                      <span className="font-medium">{evaluation.kpi_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={config.badge}>
                        {evaluation.performance_percentage.toFixed(0)}%
                      </Badge>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180"
                      )} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm text-start">
                    <div>
                      <span className="text-muted-foreground">{t('kpiAdmin.current', 'Current')}: </span>
                      <span className="font-medium">{evaluation.current_value}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('kpiAdmin.target', 'Target')}: </span>
                      <span className="font-medium">{evaluation.target_value}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {evaluation.gap_analysis.gap_value > 0 ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                      <span className={evaluation.gap_analysis.gap_value > 0 ? 'text-destructive' : 'text-green-500'}>
                        {Math.abs(evaluation.gap_analysis.gap_percentage).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Progress 
                      value={progressValue} 
                      className="h-2"
                    />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Gap Analysis */}
                    <div>
                      <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {t('kpiAdmin.gapAnalysis', 'Gap Analysis')}
                      </h5>
                      {evaluation.gap_analysis.primary_causes.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs text-muted-foreground">
                            {t('kpiAdmin.primaryCauses', 'Primary Causes')}:
                          </span>
                          <ul className="text-sm mt-1 space-y-1">
                            {evaluation.gap_analysis.primary_causes.map((cause, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{cause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* AI Recommendations */}
                    <div>
                      <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        {t('kpiAdmin.recommendations', 'AI Recommendations')}
                      </h5>
                      <ul className="text-sm space-y-1">
                        {evaluation.ai_insights.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                      {evaluation.ai_insights.estimated_impact && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium">{t('kpiAdmin.expectedImpact', 'Expected Impact')}: </span>
                          {evaluation.ai_insights.estimated_impact}
                        </p>
                      )}
                    </div>

                    {/* Trend Forecast */}
                    <div className="p-3 bg-background/50 rounded-lg">
                      <h5 className="text-sm font-medium mb-1">
                        {t('kpiAdmin.trendForecast', 'Trend Forecast')}
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {t('kpiAdmin.projectedValue', 'Projected value')}: <strong>{evaluation.trend_forecast.projected_value}</strong> ({evaluation.trend_forecast.timeframe})
                        <span className="ms-2">
                          ({t('kpiAdmin.confidence', 'Confidence')}: {evaluation.trend_forecast.confidence}%)
                        </span>
                      </p>
                    </div>

                    {/* Target Suggestion */}
                    {evaluation.ai_insights.target_suggestion && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm">
                          <span className="font-medium">{t('kpiAdmin.targetSuggestion', 'Suggested Target')}: </span>
                          {evaluation.ai_insights.target_suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}

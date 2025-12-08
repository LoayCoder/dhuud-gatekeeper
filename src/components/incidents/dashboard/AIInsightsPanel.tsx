import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, Sparkles, AlertTriangle, TrendingUp, Lightbulb, RefreshCw } from "lucide-react";
import type { AIRiskInsights } from "@/hooks/use-hsse-risk-analytics";

interface Props {
  insights: AIRiskInsights | null;
  isLoading: boolean;
  onRefresh: () => void;
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'secondary';
    default: return 'outline';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
}

export function AIInsightsPanel({ insights, isLoading, onRefresh }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          {t('hsseDashboard.aiRiskInsights')}
          <Sparkles className="h-3 w-3 text-yellow-500" />
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('hsseDashboard.refreshInsights')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !insights ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{t('hsseDashboard.noInsightsYet')}</p>
            <Button onClick={onRefresh} disabled={isLoading}>
              <Sparkles className="h-4 w-4 me-2" />
              {t('hsseDashboard.generateInsights')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            {insights.summary && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm leading-relaxed">{insights.summary}</p>
              </div>
            )}

            <Accordion type="multiple" className="w-full">
              {/* Patterns */}
              {insights.patterns?.length > 0 && (
                <AccordionItem value="patterns">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span>{t('hsseDashboard.patternsDetected')}</span>
                      <Badge variant="secondary">{insights.patterns.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {insights.patterns.map((pattern, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="capitalize">{pattern.pattern_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(pattern.confidence * 100)}% {t('hsseDashboard.confidence')}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{pattern.description}</p>
                          <p className="text-xs text-primary">{pattern.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Anomalies */}
              {insights.anomalies?.length > 0 && (
                <AccordionItem value="anomalies">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span>{t('hsseDashboard.anomaliesDetected')}</span>
                      <Badge variant="secondary">{insights.anomalies.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {insights.anomalies.map((anomaly, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getSeverityColor(anomaly.severity) as any}>{anomaly.severity}</Badge>
                            <span className="text-xs text-muted-foreground">{anomaly.date_range}</span>
                          </div>
                          <p className="text-sm">{anomaly.description}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Recommendations */}
              {insights.recommendations?.length > 0 && (
                <AccordionItem value="recommendations">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-green-500" />
                      <span>{t('hsseDashboard.recommendations')}</span>
                      <Badge variant="secondary">{insights.recommendations.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {insights.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getPriorityColor(rec.priority) as any}>{rec.priority}</Badge>
                            <span className="text-sm font-medium">{rec.area}</span>
                          </div>
                          <p className="text-sm mb-1">{rec.action}</p>
                          <p className="text-xs text-muted-foreground">{rec.expected_impact}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

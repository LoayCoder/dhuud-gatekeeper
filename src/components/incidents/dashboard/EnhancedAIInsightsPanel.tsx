import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Brain, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Lightbulb, 
  RefreshCw,
  Shield,
  Building2,
  Users,
  Radar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import type { AIRiskInsights } from "@/hooks/use-hsse-risk-analytics";

interface Props {
  insights: AIRiskInsights | null;
  isLoading: boolean;
  onRefresh: () => void;
  lastUpdated?: Date;
}

function getRiskLevelColor(level: string) {
  switch (level) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'outline';
  }
}

function getRiskLevelBgColor(level: string) {
  switch (level) {
    case 'critical': return 'bg-destructive/10 border-destructive/30';
    case 'high': return 'bg-orange-500/10 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'low': return 'bg-green-500/10 border-green-500/30';
    default: return 'bg-muted/50';
  }
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

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'improving': return <TrendingDown className="h-4 w-4 text-green-500" />;
    case 'declining': return <TrendingUp className="h-4 w-4 text-destructive" />;
    default: return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTrendColor(trend: string) {
  switch (trend) {
    case 'improving': return 'text-green-600';
    case 'declining': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
}

export function EnhancedAIInsightsPanel({ insights, isLoading, onRefresh, lastUpdated }: Props) {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary']);

  const totalInsights = insights 
    ? (insights.patterns?.length || 0) + 
      (insights.anomalies?.length || 0) + 
      (insights.recommendations?.length || 0) +
      (insights.emerging_hazards?.length || 0) +
      (insights.predictive_risks?.length || 0) +
      (insights.behavioral_insights?.length || 0)
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {t('hsseDashboard.aiRiskInsights')}
            <Sparkles className="h-3 w-3 text-yellow-500" />
          </CardTitle>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t('hsseDashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
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
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
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
            {/* Summary with insight count */}
            {insights.summary && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary">{t('hsseDashboard.executiveSummary')}</span>
                  <Badge variant="secondary">{totalInsights} {t('hsseDashboard.insightsFound')}</Badge>
                </div>
                <p className="text-sm leading-relaxed">{insights.summary}</p>
              </div>
            )}

            <Accordion 
              type="multiple" 
              value={expandedSections}
              onValueChange={setExpandedSections}
              className="w-full"
            >
              {/* Emerging Hazards - NEW */}
              {insights.emerging_hazards?.length > 0 && (
                <AccordionItem value="emerging_hazards">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Radar className="h-4 w-4 text-orange-500" />
                      <span>{t('hsseDashboard.emergingHazards')}</span>
                      <Badge variant="destructive">{insights.emerging_hazards.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {insights.emerging_hazards.map((hazard, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border ${getRiskLevelBgColor(hazard.risk_level)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-sm">{hazard.category}</span>
                            <Badge variant={getRiskLevelColor(hazard.risk_level) as any} className="capitalize">
                              {hazard.risk_level}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{hazard.trend}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">{t('hsseDashboard.earlyIndicators')}:</span> {hazard.early_indicators}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Predictive Risks - NEW */}
              {insights.predictive_risks?.length > 0 && (
                <AccordionItem value="predictive_risks">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span>{t('hsseDashboard.predictiveRisks')}</span>
                      <Badge variant="secondary">{insights.predictive_risks.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {insights.predictive_risks.map((risk, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getPriorityColor(risk.probability) as any} className="capitalize">
                              {risk.probability} {t('hsseDashboard.probability')}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {risk.timeframe}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{risk.description}</p>
                          <p className="text-xs text-primary flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            {risk.prevention_action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Branch Risk Scores - NEW */}
              {insights.branch_risk_scores?.length > 0 && (
                <AccordionItem value="branch_risks">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <span>{t('hsseDashboard.branchRiskScores')}</span>
                      <Badge variant="secondary">{insights.branch_risk_scores.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {insights.branch_risk_scores.map((branch, idx) => (
                        <TooltipProvider key={idx}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-3 bg-muted/50 rounded-lg cursor-help">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{branch.branch_name}</span>
                                  <Badge variant={getRiskLevelColor(branch.risk_level) as any} className="capitalize">
                                    {branch.score}/100
                                  </Badge>
                                </div>
                                <Progress value={branch.score} className="h-2 mb-2" />
                                <p className="text-xs text-muted-foreground">{branch.top_issue}</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('hsseDashboard.riskLevel')}: {branch.risk_level}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Department Risk Scores - NEW */}
              {insights.department_risk_scores?.length > 0 && (
                <AccordionItem value="department_risks">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-500" />
                      <span>{t('hsseDashboard.departmentRiskScores')}</span>
                      <Badge variant="secondary">{insights.department_risk_scores.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {insights.department_risk_scores.map((dept, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{dept.department_name}</span>
                            <Badge variant={getRiskLevelColor(dept.risk_level) as any} className="capitalize">
                              {dept.score}/100
                            </Badge>
                          </div>
                          <Progress value={dept.score} className="h-2 mb-2" />
                          <p className="text-xs text-muted-foreground">{dept.top_issue}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Behavioral Insights - NEW */}
              {insights.behavioral_insights?.length > 0 && (
                <AccordionItem value="behavioral">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-teal-500" />
                      <span>{t('hsseDashboard.behavioralInsights')}</span>
                      <Badge variant="secondary">{insights.behavioral_insights.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {insights.behavioral_insights.map((behavior, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{behavior.observation_type}</span>
                            <div className="flex items-center gap-2">
                              {getTrendIcon(behavior.trend)}
                              <span className={`text-sm font-medium ${getTrendColor(behavior.trend)}`}>
                                {behavior.percentage_change}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-primary">{behavior.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Existing: Patterns */}
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

              {/* Existing: Anomalies */}
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

              {/* Existing: Recommendations */}
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

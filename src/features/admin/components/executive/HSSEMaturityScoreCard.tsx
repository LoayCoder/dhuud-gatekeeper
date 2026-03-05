import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { HSSEMaturityScore } from "@/hooks/use-executive-ai-insights";
import { cn } from "@/lib/utils";

interface HSSEMaturityScoreCardProps {
  maturityScore: HSSEMaturityScore | null;
  isLoading?: boolean;
}

const gradeColors: Record<string, string> = {
  'A': 'bg-green-500',
  'B': 'bg-emerald-500',
  'C': 'bg-yellow-500',
  'D': 'bg-orange-500',
  'F': 'bg-destructive',
};

const gradeTextColors: Record<string, string> = {
  'A': 'text-green-500',
  'B': 'text-emerald-500',
  'C': 'text-yellow-500',
  'D': 'text-orange-500',
  'F': 'text-destructive',
};

const componentLabels: Record<string, string> = {
  incident_prevention: 'executiveReport.ai.incidentPrevention',
  action_effectiveness: 'executiveReport.ai.actionEffectiveness',
  kpi_performance: 'executiveReport.ai.kpiPerformance',
  inspection_rigor: 'executiveReport.ai.inspectionRigor',
  observation_culture: 'executiveReport.ai.observationCulture',
};

export function HSSEMaturityScoreCard({ maturityScore, isLoading }: HSSEMaturityScoreCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t('executiveReport.ai.maturityScore')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-4 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!maturityScore) {
    return null;
  }

  const { score, grade, components, narrative } = maturityScore;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          {t('executiveReport.ai.maturityScore')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className={cn(
              "text-6xl font-bold",
              gradeTextColors[grade] || 'text-muted-foreground'
            )}>
              {grade}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {t('executiveReport.ai.grade')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">{score}</div>
            <div className="text-sm text-muted-foreground">/100</div>
          </div>
        </div>

        {/* Narrative */}
        <p className="text-sm text-muted-foreground text-center italic border-y py-3">
          "{narrative}"
        </p>

        {/* Component Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{t('executiveReport.ai.componentBreakdown')}</h4>
          {Object.entries(components).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t(componentLabels[key] || key)}</span>
                <span className="font-medium">{value}%</span>
              </div>
              <Progress 
                value={value} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

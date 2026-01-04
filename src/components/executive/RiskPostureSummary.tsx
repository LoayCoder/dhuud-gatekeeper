import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { RiskPosture } from "@/hooks/use-executive-ai-insights";
import { cn } from "@/lib/utils";

interface RiskPostureSummaryProps {
  riskPosture: RiskPosture | null;
  isLoading?: boolean;
}

const riskLevelColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500' },
  moderate: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500' },
  low: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500' },
};

const trendIcons = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const trendColors = {
  improving: 'text-green-500',
  stable: 'text-muted-foreground',
  declining: 'text-destructive',
};

export function RiskPostureSummary({ riskPosture, isLoading }: RiskPostureSummaryProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('executiveReport.ai.riskPosture')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!riskPosture) {
    return null;
  }

  const { current, trend, change_description } = riskPosture;
  const colors = riskLevelColors[current] || riskLevelColors.moderate;
  const TrendIcon = trendIcons[trend] || Minus;

  return (
    <Card className={cn("border-2", colors.border)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('executiveReport.ai.riskPosture')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn("p-4 rounded-lg text-center", colors.bg)}>
          <div className={cn("text-2xl font-bold uppercase", colors.text)}>
            {t(`executiveReport.ai.riskLevel.${current}`)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <TrendIcon className={cn("h-4 w-4", trendColors[trend])} />
            <span className={cn("text-sm font-medium", trendColors[trend])}>
              {t(`executiveReport.ai.trend.${trend}`)}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {change_description}
        </p>
      </CardContent>
    </Card>
  );
}

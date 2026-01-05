import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, ThumbsUp, Shield, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PositiveObservationData {
  safe_act_count: number;
  safe_condition_count: number;
  unsafe_act_count: number;
  unsafe_condition_count: number;
}

interface PositiveObservationCardProps {
  data: PositiveObservationData | null;
  isLoading?: boolean;
}

export function PositiveObservationCard({ data, isLoading }: PositiveObservationCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-success" />
            {t('positiveObservation.totalPositive')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const safeActs = data?.safe_act_count ?? 0;
  const safeConditions = data?.safe_condition_count ?? 0;
  const unsafeActs = data?.unsafe_act_count ?? 0;
  const unsafeConditions = data?.unsafe_condition_count ?? 0;

  const totalPositive = safeActs + safeConditions;
  const totalNegative = unsafeActs + unsafeConditions;
  const total = totalPositive + totalNegative;

  // Calculate ratio
  const ratio = totalNegative > 0 
    ? (totalPositive / totalNegative).toFixed(1)
    : totalPositive > 0 ? '∞' : '0';

  // Percentage positive
  const positivePercent = total > 0 ? Math.round((totalPositive / total) * 100) : 0;

  return (
    <Card className="border-success/30 bg-success/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-success" />
          {t('positiveObservation.totalPositive')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-success">{totalPositive}</p>
            <p className="text-xs text-muted-foreground">{t('positiveObservation.totalPositive')}</p>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-sm px-3 py-1",
              positivePercent >= 50 ? "border-success text-success" : "border-warning text-warning"
            )}
          >
            {positivePercent}% {t('hsseDashboard.observations')}
          </Badge>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-success/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">{t('positiveObservation.safeActs')}</span>
            </div>
            <p className="text-xl font-bold">{safeActs}</p>
          </div>
          <div className="p-3 bg-success/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">{t('positiveObservation.safeConditions')}</span>
            </div>
            <p className="text-xl font-bold">{safeConditions}</p>
          </div>
        </div>

        {/* Ratio */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('positiveObservation.observationRatio')}</span>
          </div>
          <div className="text-end">
            <span className="font-bold text-lg">{ratio}</span>
            <span className="text-xs text-muted-foreground ms-1">{t('positiveObservation.positiveToNegative')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useTranslation } from 'react-i18next';
import { format, differenceInDays } from 'date-fns';
import { Brain, AlertTriangle, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  useAssetFailurePredictions, 
  useAcknowledgePrediction, 
  useAddressPrediction,
  useDismissPrediction 
} from '@/hooks/use-asset-health-scores';
import { cn } from '@/lib/utils';

interface PredictiveMaintenanceCardProps {
  assetId?: string;
  showAssetName?: boolean;
  limit?: number;
}

const SEVERITY_COLORS = {
  low: 'bg-blue-500/10 text-blue-700 border-blue-200',
  medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  high: 'bg-orange-500/10 text-orange-700 border-orange-200',
  critical: 'bg-red-500/10 text-red-700 border-red-200',
};

const PRIORITY_LABELS = {
  1: 'P1 - Critical',
  2: 'P2 - High',
  3: 'P3 - Medium',
  4: 'P4 - Low',
  5: 'P5 - Minimal',
};

export function PredictiveMaintenanceCard({ 
  assetId, 
  showAssetName = false,
  limit = 5 
}: PredictiveMaintenanceCardProps) {
  const { t } = useTranslation();
  const { data: predictions, isLoading } = useAssetFailurePredictions(assetId);
  const acknowledgeMutation = useAcknowledgePrediction();
  const addressMutation = useAddressPrediction();
  const dismissMutation = useDismissPrediction();

  const formatCurrency = (value: number | undefined | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </CardContent>
      </Card>
    );
  }

  const displayPredictions = predictions?.slice(0, limit) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-purple-600" />
          {t('assets.predictions.title', 'AI Failure Predictions')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayPredictions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>{t('assets.predictions.noPredictions', 'No predicted failures - asset is healthy!')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayPredictions.map((prediction) => {
              const daysUntil = differenceInDays(new Date(prediction.predicted_date), new Date());
              const isUrgent = daysUntil <= 7;
              const isPast = daysUntil < 0;

              return (
                <div 
                  key={prediction.id} 
                  className={cn(
                    'p-4 rounded-lg border space-y-3',
                    isUrgent && 'border-destructive/50 bg-destructive/5'
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      {showAssetName && prediction.asset && (
                        <p className="text-xs text-muted-foreground">
                          {prediction.asset.asset_code} - {prediction.asset.name}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn(
                          'h-4 w-4',
                          prediction.severity === 'critical' ? 'text-red-600' :
                          prediction.severity === 'high' ? 'text-orange-600' :
                          prediction.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        )} />
                        <span className="font-medium">{prediction.predicted_failure_type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(SEVERITY_COLORS[prediction.severity])}>
                        {t(`common.severity.${prediction.severity}`, prediction.severity)}
                      </Badge>
                      {prediction.priority && (
                        <Badge variant="secondary" className="text-xs">
                          {PRIORITY_LABELS[prediction.priority as keyof typeof PRIORITY_LABELS] || `P${prediction.priority}`}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {isPast 
                          ? t('assets.predictions.overdue', 'Overdue')
                          : t('assets.predictions.daysUntil', '{{days}} days until', { days: daysUntil })
                        }
                        <span className="text-muted-foreground ms-1">
                          ({format(new Date(prediction.predicted_date), 'dd/MM/yyyy')})
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {t('assets.predictions.confidence', 'Confidence')}:
                      </span>
                      <span className="font-medium">{prediction.confidence_pct.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Costs */}
                  {(prediction.estimated_repair_cost || prediction.cost_if_ignored) && (
                    <div className="flex items-center gap-4 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {prediction.estimated_repair_cost && (
                        <span>
                          {t('assets.predictions.repairCost', 'Repair')}: {formatCurrency(prediction.estimated_repair_cost)}
                        </span>
                      )}
                      {prediction.cost_if_ignored && (
                        <span className="text-destructive">
                          {t('assets.predictions.costIfIgnored', 'If ignored')}: {formatCurrency(prediction.cost_if_ignored)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Recommended Action */}
                  {prediction.recommended_action && (
                    <div className="p-2 rounded bg-muted/50 text-sm">
                      <span className="text-muted-foreground">
                        {t('assets.predictions.recommendation', 'Recommendation')}:
                      </span>
                      <p className="mt-1">{prediction.recommended_action}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => addressMutation.mutate(prediction.id)}
                      disabled={addressMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 me-1" />
                      {t('assets.predictions.markAddressed', 'Mark Addressed')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => acknowledgeMutation.mutate(prediction.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      {t('assets.predictions.acknowledge', 'Acknowledge')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => dismissMutation.mutate({ predictionId: prediction.id })}
                      disabled={dismissMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 me-1" />
                      {t('assets.predictions.dismiss', 'Dismiss')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

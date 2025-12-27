import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Activity, AlertTriangle, Wrench, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ModuleGate } from '@/components/ModuleGate';
import { AssetHealthScoreCard } from '@/components/assets/AssetHealthScoreCard';
import { PredictiveMaintenanceCard } from '@/components/assets/PredictiveMaintenanceCard';
import { useAsset } from '@/hooks/use-assets';
import { useAssetHealthScore, useCalculateHealthScore } from '@/hooks/use-asset-health-scores';
import { useAssetMaintenanceHistory } from '@/hooks/use-asset-maintenance-history';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const MAINTENANCE_TYPE_COLORS: Record<string, string> = {
  preventive: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  corrective: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  predictive: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  emergency: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

function AssetHealthContent() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();

  const { data: asset, isLoading: assetLoading } = useAsset(id);
  const { data: healthScore, isLoading: healthLoading } = useAssetHealthScore(id);
  const { data: history, isLoading: historyLoading } = useAssetMaintenanceHistory(id);
  const calculateHealth = useCalculateHealthScore();

  const handleRecalculate = async () => {
    if (!id) return;
    try {
      await calculateHealth.mutateAsync(id);
      toast({
        title: String(t('common.success')),
        description: String(t('assets.healthRecalculated', 'Health score recalculated successfully')),
      });
    } catch (error) {
      console.error('Failed to recalculate health:', error);
    }
  };

  if (assetLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">{String(t('assets.notFound'))}</h3>
            <Button variant="link" onClick={() => navigate('/assets')}>
              {String(t('common.backToList'))}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assetData = asset as any;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/assets/${id}`)}>
            <ArrowLeft className={cn("h-5 w-5", direction === 'rtl' && "rotate-180")} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              {String(t('assets.healthPredictions', 'Health & Predictions'))}
            </h1>
            <p className="text-muted-foreground">
              {assetData.name} ({asset.asset_code})
            </p>
          </div>
        </div>
        <Button onClick={handleRecalculate} disabled={calculateHealth.isPending}>
          <RefreshCw className={cn("h-4 w-4 me-2", calculateHealth.isPending && "animate-spin")} />
          {String(t('assets.recalculateHealth', 'Recalculate Health'))}
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {String(t('assets.healthScore', 'Health Score'))}
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {String(t('assets.predictions', 'Predictions'))}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {String(t('assets.maintenanceHistory', 'Maintenance History'))}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <div className="grid gap-6 md:grid-cols-2">
            <AssetHealthScoreCard assetId={id!} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {String(t('assets.contributingFactors', 'Contributing Factors'))}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : healthScore ? (
                  <div className="space-y-4">
                    <FactorBar label={String(t('assets.ageFactor', 'Age Factor'))} value={healthScore.age_factor || 0} />
                    <FactorBar label={String(t('assets.conditionFactor', 'Condition Factor'))} value={healthScore.condition_factor || 0} />
                    <FactorBar label={String(t('assets.maintenanceCompliance', 'Maintenance Compliance'))} value={healthScore.maintenance_compliance_pct || 0} />
                    <FactorBar label={String(t('assets.usageFactor', 'Usage Factor'))} value={healthScore.usage_factor || 0} />
                    <FactorBar label={String(t('assets.environmentFactor', 'Environment Factor'))} value={healthScore.environment_factor || 0} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {String(t('assets.noHealthData', 'No health data available. Click recalculate to generate.'))}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions">
          <PredictiveMaintenanceCard assetId={id!} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                {String(t('assets.maintenanceHistory', 'Maintenance History'))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((record: any) => (
                    <div key={record.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={MAINTENANCE_TYPE_COLORS[record.maintenance_type] || ''}>
                              {String(t(`assets.maintenanceTypes.${record.maintenance_type}`, record.maintenance_type))}
                            </Badge>
                            {record.was_unplanned && (
                              <Badge variant="destructive">
                                {String(t('assets.unplanned', 'Unplanned'))}
                              </Badge>
                            )}
                          </div>
                          {record.notes && (
                            <p className="text-sm text-muted-foreground">{record.notes}</p>
                          )}
                          <div className="flex flex-wrap gap-4 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              {format(new Date(record.performed_date), 'PPP')}
                            </span>
                            {record.cost && (
                              <span className="font-medium">
                                {record.cost.toLocaleString()} {record.currency || 'SAR'}
                              </span>
                            )}
                          </div>
                        </div>
                        {record.condition_after && (
                          <Badge variant="outline">
                            {String(t(`assets.conditions.${record.condition_after}`, record.condition_after))}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {String(t('assets.noMaintenanceHistory', 'No maintenance history recorded'))}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 70) return 'bg-green-500';
    if (v >= 50) return 'bg-yellow-500';
    if (v >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full transition-all", getColor(value))} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AssetHealth() {
  return (
    <ModuleGate module="asset_management" showUpgradePrompt>
      <AssetHealthContent />
    </ModuleGate>
  );
}

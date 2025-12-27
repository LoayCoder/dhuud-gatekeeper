import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFleetHealthStats } from '@/hooks/use-asset-health-dashboard';
import { Wrench, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MaintenanceComplianceWidget() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useFleetHealthStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalAssets === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t('assetHealth.maintenanceCompliance')}
          </CardTitle>
          <CardDescription>{t('assetHealth.maintenanceComplianceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('assetHealth.noMaintenanceData')}</p>
        </CardContent>
      </Card>
    );
  }

  const complianceRate = stats.averageComplianceRate;
  
  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-blue-600 dark:text-blue-400';
    if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-destructive';
  };

  const getComplianceBarColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-blue-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  // Calculate net trend
  const netTrend = stats.improvingTrend - stats.decliningTrend;
  const getTrendIndicator = () => {
    if (netTrend > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">{t('assetHealth.improving')}</span>
        </div>
      );
    }
    if (netTrend < 0) {
      return (
        <div className="flex items-center gap-1 text-destructive">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs font-medium">{t('assetHealth.declining')}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="text-xs font-medium">{t('assetHealth.stable')}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          {t('assetHealth.maintenanceCompliance')}
        </CardTitle>
        <CardDescription>{t('assetHealth.maintenanceComplianceDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compliance Rate Display */}
        <div className="flex items-end justify-between">
          <div>
            <p className={cn('text-4xl font-bold', getComplianceColor(complianceRate))}>
              {complianceRate}%
            </p>
            <p className="text-sm text-muted-foreground">{t('assetHealth.complianceRate')}</p>
          </div>
          {getTrendIndicator()}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all duration-500', getComplianceBarColor(complianceRate))}
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>

        {/* Trend Distribution */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <span className="text-lg font-semibold">{stats.improvingTrend}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('assetHealth.improving')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-lg font-semibold">{stats.stableTrend}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('assetHealth.stable')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <span className="text-lg font-semibold">{stats.decliningTrend}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('assetHealth.declining')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

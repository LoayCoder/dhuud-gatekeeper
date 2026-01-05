import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFleetHealthStats } from '@/hooks/use-asset-health-dashboard';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FleetHealthOverviewWidget() {
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
            <Activity className="h-5 w-5" />
            {t('assetHealth.fleetOverview')}
          </CardTitle>
          <CardDescription>{t('assetHealth.fleetOverviewDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('assetHealth.noAssetsTracked')}</p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 55) return 'text-warning';
    if (score >= 40) return 'text-pending';
    return 'text-destructive';
  };

  const riskDistribution = [
    { 
      label: t('assetHealth.critical'), 
      count: stats.criticalCount, 
      color: 'bg-destructive',
      percentage: (stats.criticalCount / stats.totalAssets) * 100
    },
    { 
      label: t('assetHealth.highRisk'), 
      count: stats.highRiskCount, 
      color: 'bg-pending',
      percentage: (stats.highRiskCount / stats.totalAssets) * 100
    },
    { 
      label: t('assetHealth.mediumRisk'), 
      count: stats.mediumRiskCount, 
      color: 'bg-warning',
      percentage: (stats.mediumRiskCount / stats.totalAssets) * 100
    },
    { 
      label: t('assetHealth.lowRisk'), 
      count: stats.lowRiskCount, 
      color: 'bg-success',
      percentage: (stats.lowRiskCount / stats.totalAssets) * 100
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('assetHealth.fleetOverview')}
        </CardTitle>
        <CardDescription>{t('assetHealth.fleetOverviewDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('assetHealth.averageScore')}</span>
          <span className={cn('text-2xl font-bold', getScoreColor(stats.averageScore))}>
            {stats.averageScore}%
          </span>
        </div>

        {/* Risk Distribution Bar */}
        <div className="space-y-2">
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            {riskDistribution.map((item, index) => (
              item.percentage > 0 && (
                <div
                  key={index}
                  className={cn('transition-all', item.color)}
                  style={{ width: `${item.percentage}%` }}
                />
              )
            ))}
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {riskDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
                <span className="text-muted-foreground">
                  {item.label}: <span className="font-medium text-foreground">{item.count}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold">{stats.totalAssets}</p>
            <p className="text-xs text-muted-foreground">{t('assetHealth.totalAssets')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-pending">
              {stats.overdueMaintenance}
            </p>
            <p className="text-xs text-muted-foreground">{t('assetHealth.overdue')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-info">
              {stats.upcomingMaintenance}
            </p>
            <p className="text-xs text-muted-foreground">{t('assetHealth.upcoming')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAtRiskAssets } from '@/hooks/use-asset-health-dashboard';
import { AlertTriangle, ArrowUpRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AtRiskAssetsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: assets, isLoading } = useAtRiskAssets(5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t('assetHealth.atRiskAssets')}
            </CardTitle>
            <CardDescription>{t('assetHealth.atRiskAssetsDesc')}</CardDescription>
          </div>
          {assets && assets.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {assets.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!assets || assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
              <AlertTriangle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="mt-2 text-sm font-medium">{t('assetHealth.noAtRiskAssets')}</p>
            <p className="text-xs text-muted-foreground">{t('assetHealth.allAssetsHealthy')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{asset.assetName}</span>
                    {getTrendIcon(asset.trend)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{asset.assetCode}</span>
                    {asset.daysUntilFailure !== null && (
                      <>
                        <span>•</span>
                        <span className={cn(
                          asset.daysUntilFailure < 30 ? 'text-destructive' : ''
                        )}>
                          {t('assetHealth.daysToFailure', { days: asset.daysUntilFailure })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ms-3">
                  <div className="text-end">
                    <p className={cn(
                      'text-lg font-bold',
                      asset.score < 40 ? 'text-destructive' : 'text-orange-600 dark:text-orange-400'
                    )}>
                      {asset.score}%
                    </p>
                    <Badge variant={getRiskBadgeVariant(asset.riskLevel)} className="text-xs">
                      {t(`assetHealth.${asset.riskLevel}`)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/assets/${asset.assetId}/health`)}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

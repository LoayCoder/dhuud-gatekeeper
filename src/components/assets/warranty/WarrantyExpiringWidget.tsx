import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Shield, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { useAssetsWithExpiringWarranty } from '@/hooks/use-warranty-claims';
import { cn } from '@/lib/utils';

interface WarrantyExpiringWidgetProps {
  daysAhead?: number;
  limit?: number;
  className?: string;
}

export function WarrantyExpiringWidget({
  daysAhead = 30,
  limit = 5,
  className,
}: WarrantyExpiringWidgetProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === 'ar';

  const { data: assets, isLoading } = useAssetsWithExpiringWarranty(daysAhead);

  const displayedAssets = assets?.slice(0, limit);
  const hasMore = (assets?.length || 0) > limit;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!assets?.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-green-500" />
            {t('assets.warranty.expiringWidgetTitle')}
          </CardTitle>
          <CardDescription>{t('assets.warranty.noExpiringWarranties')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Shield className="h-8 w-8 me-2 text-green-500/50" />
            <span>{t('assets.warranty.allWarrantiesGood')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t('assets.warranty.expiringWidgetTitle')}
            </CardTitle>
            <CardDescription>
              {t('assets.warranty.expiringCount', { count: assets.length, days: daysAhead })}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            {assets.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayedAssets?.map((asset) => {
          const daysLeft = differenceInDays(new Date(asset.warranty_expiry_date!), new Date());
          const isUrgent = daysLeft <= 7;

          return (
            <div
              key={asset.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors',
                isUrgent ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-muted/50 hover:bg-muted'
              )}
              onClick={() => navigate(`/assets/${asset.id}`)}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{asset.name}</p>
                <p className="text-xs text-muted-foreground">
                  {asset.asset_code}
                  {asset.warranty_provider && ` • ${asset.warranty_provider}`}
                </p>
              </div>
              <div className="text-end shrink-0 ms-3">
                <p className={cn(
                  'text-sm font-medium',
                  isUrgent ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                )}>
                  {t('assets.warranty.daysLeft', { count: daysLeft })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(asset.warranty_expiry_date!), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => navigate('/assets/warranties')}
          >
            {t('assets.warranty.viewAll')}
            <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

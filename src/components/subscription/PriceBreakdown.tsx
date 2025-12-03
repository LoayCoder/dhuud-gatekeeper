import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Package, Calculator, Sparkles } from 'lucide-react';
import { formatPrice, type PriceBreakdown as PriceBreakdownType } from '@/hooks/use-price-calculator';
import { cn } from '@/lib/utils';

interface PriceBreakdownProps {
  breakdown: PriceBreakdownType | null;
  isLoading?: boolean;
  planName?: string;
  className?: string;
  compact?: boolean;
}

export function PriceBreakdown({ 
  breakdown, 
  isLoading, 
  planName,
  className,
  compact = false 
}: PriceBreakdownProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            {t('subscription.priceBreakdown', 'Price Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Separator />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!breakdown) {
    return (
      <Card className={cn("border-muted", className)}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
            <Calculator className="h-5 w-5" />
            {t('subscription.priceBreakdown', 'Price Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('subscription.selectPlanToCalculate', 'Select a plan to calculate pricing')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-br from-background to-primary/5", className)}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            {t('subscription.priceBreakdown', 'Price Breakdown')}
          </span>
          {planName && (
            <Badge variant="secondary" className="font-normal">
              {planName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Base Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('subscription.basePlan', 'Base Plan')}</span>
            <span className="text-xs text-muted-foreground">
              ({breakdown.includedUsers} {t('subscription.usersIncluded', 'users included')})
            </span>
          </div>
          <span className="font-medium">{formatPrice(breakdown.basePrice)}</span>
        </div>

        {/* Extra Users */}
        {breakdown.extraUsers > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {t('subscription.additionalUsers', 'Additional Users')}
              </span>
              <span className="text-xs text-muted-foreground">
                ({breakdown.extraUsers} × {formatPrice(breakdown.pricePerUser)})
              </span>
            </div>
            <span className="font-medium">{formatPrice(breakdown.userPrice)}</span>
          </div>
        )}

        {/* Modules */}
        {breakdown.modulePrice > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('subscription.additionalModules', 'Additional Modules')}</span>
              </div>
              <span className="font-medium">{formatPrice(breakdown.modulePrice)}</span>
            </div>
            {!compact && breakdown.moduleDetails.length > 0 && (
              <div className="ms-6 space-y-1">
                {breakdown.moduleDetails
                  .filter(m => !m.included && m.price > 0)
                  .map(mod => (
                    <div key={mod.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{mod.name}</span>
                      <span>{formatPrice(mod.price)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">
            {t('subscription.totalMonthly', 'Total Monthly')}
          </span>
          <div className="text-end">
            <span className="text-2xl font-bold text-primary">
              {formatPrice(breakdown.totalMonthly)}
            </span>
            <span className="text-xs text-muted-foreground block">
              /{t('subscription.month', 'month')}
            </span>
          </div>
        </div>

        {/* Annual estimate */}
        {!compact && (
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <span className="text-sm text-muted-foreground">
              {t('subscription.annualEstimate', 'Annual estimate')}: {' '}
            </span>
            <span className="font-semibold">
              {formatPrice(breakdown.totalMonthly * 12)}
            </span>
            <span className="text-xs text-muted-foreground ms-1">
              ({t('subscription.save10', 'Save ~10% with annual billing')})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

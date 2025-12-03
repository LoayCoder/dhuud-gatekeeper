import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Package, Calculator, Sparkles, Percent } from 'lucide-react';
import { formatPrice, type PriceBreakdown as PriceBreakdownType } from '@/hooks/use-price-calculator';
import { cn } from '@/lib/utils';

interface PriceBreakdownProps {
  breakdown: PriceBreakdownType | null;
  isLoading?: boolean;
  planName?: string;
  className?: string;
  compact?: boolean;
  billingMonths?: number;
}

// Get discount percentage based on billing months
function getDiscountPercent(months: number): number {
  if (months === 12) return 10; // Yearly: 10% discount
  if (months >= 6) return 5; // 6+ months: 5% discount
  return 0;
}

export function PriceBreakdown({ 
  breakdown, 
  isLoading, 
  planName,
  className,
  compact = false,
  billingMonths = 1
}: PriceBreakdownProps) {
  const { t } = useTranslation();

  const discountPercent = getDiscountPercent(billingMonths);
  const periodTotal = breakdown ? breakdown.totalMonthly * billingMonths : 0;
  const discountAmount = periodTotal * (discountPercent / 100);
  const finalTotal = periodTotal - discountAmount;

  // Format period label
  const getPeriodLabel = () => {
    if (billingMonths === 12) return t('subscription.oneYear');
    if (billingMonths === 1) return t('subscription.oneMonth');
    return t('subscription.nMonths', { count: billingMonths });
  };

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

        {/* Monthly Subtotal */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('subscription.monthlyRate', 'Monthly Rate')}</span>
          <span>{formatPrice(breakdown.totalMonthly)}/{t('subscription.month', 'month')}</span>
        </div>

        <Separator />

        {/* Billing Period Summary */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('subscription.billingPeriod', 'Billing Period')}</span>
            <Badge variant="outline">{getPeriodLabel()}</Badge>
          </div>
          
          {/* Original price before discount */}
          {discountPercent > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('subscription.originalPrice', 'Original Price')}</span>
                <span className="line-through text-muted-foreground">{formatPrice(periodTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  {t('subscription.discountApplied', '{{percent}}% Discount', { percent: discountPercent })}
                </span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            </>
          )}
        </div>

        {/* Total for Period */}
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">
            {billingMonths === 1 
              ? t('subscription.totalMonthly', 'Total Monthly')
              : t('subscription.totalForPeriod', 'Total for {{period}}', { period: getPeriodLabel() })
            }
          </span>
          <div className="text-end">
            <span className="text-2xl font-bold text-primary">
              {formatPrice(finalTotal)}
            </span>
            {billingMonths > 1 && (
              <span className="text-xs text-muted-foreground block">
                ({formatPrice(finalTotal / billingMonths)}/{t('subscription.month', 'month')})
              </span>
            )}
          </div>
        </div>

        {/* Savings message */}
        {!compact && discountPercent > 0 && (
          <div className="rounded-lg bg-green-500/10 p-3 text-center">
            <span className="text-sm text-green-600 font-medium">
              {t('subscription.youSave', 'You save')} {formatPrice(discountAmount)} {t('subscription.comparedToMonthly', 'compared to monthly billing')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, Calendar, Package, Users, Sparkles } from 'lucide-react';
import { formatPrice } from '@/hooks/use-price-calculator';
import { cn } from '@/lib/utils';

interface SelectionSummaryProps {
  planName?: string;
  billingMonths: number;
  userCount: number;
  moduleCount: number;
  totalPrice: number;
  className?: string;
}

export function SelectionSummary({
  planName,
  billingMonths,
  userCount,
  moduleCount,
  totalPrice,
  className,
}: SelectionSummaryProps) {
  const { t } = useTranslation();

  // Format period label
  const getPeriodLabel = () => {
    if (billingMonths === 12) return t('subscription.oneYear');
    if (billingMonths === 1) return t('subscription.oneMonth');
    return t('subscription.nMonths', { count: billingMonths });
  };

  // Get discount percentage
  const getDiscountPercent = () => {
    if (billingMonths === 12) return 10;
    if (billingMonths >= 6) return 5;
    return 0;
  };

  const discountPercent = getDiscountPercent();

  return (
    <Card className={cn("border-primary/30 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" />
          {t('subscription.selectionSummary', 'Selection Summary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Plan */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            {t('subscription.plan', 'Plan')}:
          </div>
          <span className="font-medium text-sm">
            {planName || t('subscription.noPlan', 'No Plan Selected')}
          </span>
        </div>

        {/* Billing Period */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {t('subscription.billingPeriod', 'Billing Period')}:
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{getPeriodLabel()}</span>
            {discountPercent > 0 && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                -{discountPercent}%
              </Badge>
            )}
          </div>
        </div>

        {/* Users */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {t('subscription.users', 'Users')}:
          </div>
          <span className="font-medium text-sm">{userCount}</span>
        </div>

        {/* Modules */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            {t('subscription.modules', 'Modules')}:
          </div>
          <span className="font-medium text-sm">{moduleCount}</span>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">
            {t('subscription.total', 'Total')}:
          </span>
          <span className="font-bold text-primary">
            {formatPrice(totalPrice)}/{t('subscription.month', 'month')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

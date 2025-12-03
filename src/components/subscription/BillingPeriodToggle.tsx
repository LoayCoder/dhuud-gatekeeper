import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Calendar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { BillingPeriod } from '@/hooks/use-price-calculator';

interface BillingPeriodToggleProps {
  billingMonths: number;
  onMonthsChange: (months: number) => void;
  disabled?: boolean;
  className?: string;
}

const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function BillingPeriodToggle({
  billingMonths,
  onMonthsChange,
  disabled,
  className,
}: BillingPeriodToggleProps) {
  const { t } = useTranslation();

  const isYearly = billingMonths === 12;
  const discountPercent = billingMonths >= 6 ? 10 : billingMonths >= 3 ? 5 : 0;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t('subscription.billingPeriod')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="billing-months">{t('subscription.selectDuration')}</Label>
          <Select
            value={billingMonths.toString()}
            onValueChange={(v) => onMonthsChange(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger id="billing-months" className="w-full">
              <SelectValue placeholder={t('subscription.selectMonths')} />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  <span className="flex items-center gap-2">
                    {month === 12 ? (
                      <>
                        <CalendarDays className="h-4 w-4" />
                        {t('subscription.yearlyOption')}
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" />
                        {month === 1 
                          ? t('subscription.monthlyOption')
                          : t('subscription.monthsOption', { count: month })
                        }
                      </>
                    )}
                    {month >= 6 && (
                      <Badge variant="secondary" className="ms-2 bg-green-500/10 text-green-600 text-xs">
                        {t('subscription.savePercent', { percent: month === 12 ? 10 : 5 })}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('subscription.selectedPeriod')}:</span>
            <span className="font-medium">
              {billingMonths === 12 
                ? t('subscription.oneYear')
                : billingMonths === 1 
                  ? t('subscription.oneMonth')
                  : t('subscription.nMonths', { count: billingMonths })
              }
            </span>
          </div>
          {discountPercent > 0 && (
            <div className="flex items-center justify-between mt-1 text-green-600">
              <span>{t('subscription.discount')}:</span>
              <span className="font-medium">{discountPercent}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

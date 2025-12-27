import { useTranslation } from 'react-i18next';
import { TrendingDown, Calendar, DollarSign, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DepreciationSchedule } from '@/hooks/use-depreciation-schedules';

interface DepreciationSummaryCardProps {
  schedules: DepreciationSchedule[];
  purchasePrice: number;
  salvageValue: number;
  currency?: string;
  isLoading?: boolean;
}

const METHOD_CONFIG: Record<string, { labelKey: string; color: string }> = {
  straight_line: { labelKey: 'assets.depreciation.straightLine', color: 'bg-blue-500/10 text-blue-700' },
  declining_balance: { labelKey: 'assets.depreciation.decliningBalance', color: 'bg-orange-500/10 text-orange-700' },
  units_of_production: { labelKey: 'assets.depreciation.unitsOfProduction', color: 'bg-green-500/10 text-green-700' },
};

const PERIOD_CONFIG: Record<string, string> = {
  monthly: 'assets.depreciation.monthly',
  quarterly: 'assets.depreciation.quarterly',
  yearly: 'assets.depreciation.yearly',
};

export function DepreciationSummaryCard({
  schedules,
  purchasePrice,
  salvageValue,
  currency = 'SAR',
  isLoading,
}: DepreciationSummaryCardProps) {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return null;
  }

  const latestSchedule = schedules[schedules.length - 1];
  const currentSchedule = schedules.find(
    s => new Date(s.period_start) <= new Date() && new Date(s.period_end) >= new Date()
  );
  const currentIndex = currentSchedule ? schedules.indexOf(currentSchedule) : -1;

  const totalDepreciable = purchasePrice - salvageValue;
  const accumulatedDepreciation = currentSchedule?.accumulated_depreciation || latestSchedule.accumulated_depreciation;
  const depreciationProgress = totalDepreciable > 0 ? (accumulatedDepreciation / totalDepreciable) * 100 : 0;
  const currentBookValue = currentSchedule?.closing_value || latestSchedule.closing_value;

  const method = schedules[0]?.depreciation_method || 'straight_line';
  const periodType = schedules[0]?.period_type || 'yearly';
  const methodConfig = METHOD_CONFIG[method] || METHOD_CONFIG.straight_line;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Current Book Value */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">{t('assets.depreciation.currentBookValue', 'Current Book Value')}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(currentBookValue)}</p>
          </CardContent>
        </Card>

        {/* Accumulated Depreciation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm">{t('assets.depreciation.totalDepreciated', 'Total Depreciated')}</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(accumulatedDepreciation)}</p>
          </CardContent>
        </Card>

        {/* Current Period */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{t('assets.depreciation.currentPeriod', 'Current Period')}</span>
            </div>
            <p className="text-2xl font-bold">
              {currentIndex >= 0 ? `${currentIndex + 1} / ${schedules.length}` : `${schedules.length}`}
            </p>
            <p className="text-sm text-muted-foreground">{t(PERIOD_CONFIG[periodType], periodType)}</p>
          </CardContent>
        </Card>

        {/* Depreciation Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Percent className="h-4 w-4" />
              <span className="text-sm">{t('assets.depreciation.progress', 'Progress')}</span>
            </div>
            <p className="text-2xl font-bold">{depreciationProgress.toFixed(1)}%</p>
            <Progress value={depreciationProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Method Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('assets.depreciation.method', 'Method')}:</span>
        <Badge variant="outline" className={cn(methodConfig.color)}>
          {t(methodConfig.labelKey, method)}
        </Badge>
      </div>
    </div>
  );
}

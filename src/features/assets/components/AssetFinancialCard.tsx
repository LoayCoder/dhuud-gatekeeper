import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingDown, Calendar, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface AssetFinancialCardProps {
  asset: {
    purchase_price?: number | null;
    salvage_value?: number | null;
    current_book_value?: number | null;
    depreciation_method?: string | null;
    depreciation_rate_pct?: number | null;
    expected_lifespan_years?: number | null;
    installation_date?: string | null;
    currency?: string | null;
  };
}

const DEPRECIATION_METHODS: Record<string, { labelKey: string; color: string }> = {
  straight_line: { labelKey: 'assets.financial.straightLine', color: 'bg-blue-500/10 text-blue-700' },
  declining_balance: { labelKey: 'assets.financial.decliningBalance', color: 'bg-orange-500/10 text-orange-700' },
  units_of_production: { labelKey: 'assets.financial.unitsOfProduction', color: 'bg-green-500/10 text-green-700' },
};

export function AssetFinancialCard({ asset }: AssetFinancialCardProps) {
  const { t } = useTranslation();
  const currency = asset.currency || 'SAR';

  const purchasePrice = asset.purchase_price || 0;
  const salvageValue = asset.salvage_value || 0;
  const currentBookValue = asset.current_book_value ?? purchasePrice;
  
  // Calculate depreciation progress
  const totalDepreciable = purchasePrice - salvageValue;
  const depreciated = purchasePrice - currentBookValue;
  const depreciationProgress = totalDepreciable > 0 ? (depreciated / totalDepreciable) * 100 : 0;

  // Calculate age
  const installationDate = asset.installation_date ? new Date(asset.installation_date) : null;
  const ageYears = installationDate ? differenceInYears(new Date(), installationDate) : 0;
  const ageMonths = installationDate ? differenceInMonths(new Date(), installationDate) % 12 : 0;

  // Calculate remaining life
  const expectedLifespan = asset.expected_lifespan_years || 0;
  const remainingLife = Math.max(0, expectedLifespan - ageYears);
  const lifeProgress = expectedLifespan > 0 ? ((expectedLifespan - remainingLife) / expectedLifespan) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const depreciationMethod = asset.depreciation_method || 'straight_line';
  const methodConfig = DEPRECIATION_METHODS[depreciationMethod] || DEPRECIATION_METHODS.straight_line;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          {t('assets.financial.title', 'Financial Information')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Value Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">{t('assets.financial.purchasePrice', 'Purchase Price')}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(purchasePrice)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <p className="text-sm text-muted-foreground">{t('assets.financial.currentBookValue', 'Current Book Value')}</p>
            <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(currentBookValue)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">{t('assets.financial.salvageValue', 'Salvage Value')}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(salvageValue)}</p>
          </div>
        </div>

        <Separator />

        {/* Depreciation Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('assets.financial.depreciationProgress', 'Depreciation Progress')}</span>
            </div>
            <Badge variant="outline" className={cn(methodConfig.color)}>
              {t(methodConfig.labelKey, depreciationMethod)}
            </Badge>
          </div>
          <Progress value={depreciationProgress} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('assets.financial.depreciated', 'Depreciated')}: {formatCurrency(depreciated)}</span>
            <span>{depreciationProgress.toFixed(1)}%</span>
          </div>
        </div>

        {asset.depreciation_rate_pct && (
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t('assets.financial.depreciationRate', 'Depreciation Rate')}</span>
            </div>
            <span className="font-medium">{asset.depreciation_rate_pct}% / year</span>
          </div>
        )}

        <Separator />

        {/* Asset Age & Remaining Life */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{t('assets.financial.assetLifecycle', 'Asset Lifecycle')}</span>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground">{t('assets.financial.assetAge', 'Asset Age')}</p>
              <p className="font-medium mt-1">
                {ageYears > 0 && `${ageYears} ${t('common.years', 'years')}`}
                {ageMonths > 0 && ` ${ageMonths} ${t('common.months', 'months')}`}
                {ageYears === 0 && ageMonths === 0 && t('assets.financial.new', 'New')}
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground">{t('assets.financial.remainingLife', 'Remaining Life')}</p>
              <p className={cn('font-medium mt-1', remainingLife <= 1 && 'text-destructive')}>
                {remainingLife > 0 
                  ? `${remainingLife} ${t('common.years', 'years')}`
                  : t('assets.financial.endOfLife', 'End of Life')}
              </p>
            </div>
          </div>

          {expectedLifespan > 0 && (
            <>
              <Progress value={lifeProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {t('assets.financial.expectedLifespan', 'Expected Lifespan')}: {expectedLifespan} {t('common.years', 'years')}
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

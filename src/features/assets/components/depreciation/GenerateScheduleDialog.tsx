import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateScheduleSchema, GenerateScheduleValues } from './GenerateScheduleSchema';
import { Calculator, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { GenerateScheduleInput, DepreciationMethod, PeriodType } from '@/hooks/use-depreciation-schedules';
import { format } from 'date-fns';

interface GenerateScheduleDialogProps {
  assetId: string;
  defaultValues?: {
    purchasePrice?: number;
    salvageValue?: number;
    usefulLifeYears?: number;
    depreciationMethod?: DepreciationMethod;
    startDate?: string;
  };
  onGenerate: (input: GenerateScheduleInput) => void;
  isGenerating?: boolean;
  trigger?: React.ReactNode;
}

const DEPRECIATION_METHODS: { value: DepreciationMethod; labelKey: string; descKey: string }[] = [
  {
    value: 'straight_line',
    labelKey: 'assets.depreciation.straightLine',
    descKey: 'assets.depreciation.straightLineDesc'
  },
  {
    value: 'declining_balance',
    labelKey: 'assets.depreciation.decliningBalance',
    descKey: 'assets.depreciation.decliningBalanceDesc'
  },
  {
    value: 'units_of_production',
    labelKey: 'assets.depreciation.unitsOfProduction',
    descKey: 'assets.depreciation.unitsOfProductionDesc'
  },
];

const PERIOD_TYPES: { value: PeriodType; labelKey: string }[] = [
  { value: 'monthly', labelKey: 'assets.depreciation.monthly' },
  { value: 'quarterly', labelKey: 'assets.depreciation.quarterly' },
  { value: 'yearly', labelKey: 'assets.depreciation.yearly' },
];

export function GenerateScheduleDialog({
  assetId,
  defaultValues,
  onGenerate,
  isGenerating,
  trigger,
}: GenerateScheduleDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const form = useForm<GenerateScheduleValues>({
    resolver: zodResolver(generateScheduleSchema),
    defaultValues: {
      depreciation_method: defaultValues?.depreciationMethod || 'straight_line',
      period_type: 'yearly',
      start_date: defaultValues?.startDate || format(new Date(), 'yyyy-MM-dd'),
      purchase_price: defaultValues?.purchasePrice || 0,
      salvage_value: defaultValues?.salvageValue || 0,
      useful_life_years: defaultValues?.usefulLifeYears || 5,
      declining_balance_rate: 2,
    }
  });

  const onSubmit = form.handleSubmit((data) => {
    onGenerate({
      asset_id: assetId,
      ...data,
    });
    setOpen(false);
  });

  const purchasePrice = form.watch('purchase_price');
  const salvageValue = form.watch('salvage_value');
  const usefulLifeYears = form.watch('useful_life_years');
  const depreciationMethod = form.watch('depreciation_method');

  const depreciableAmount = purchasePrice - salvageValue;
  const annualDepreciation = depreciableAmount / (usefulLifeYears || 1);

  const selectedMethod = DEPRECIATION_METHODS.find(m => m.value === depreciationMethod);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Calculator className="h-4 w-4 me-2" />
            {t('assets.depreciation.generateSchedule', 'Generate Schedule')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t('assets.depreciation.generateSchedule', 'Generate Depreciation Schedule')}
          </DialogTitle>
          <DialogDescription>
            {t('assets.depreciation.generateDesc', 'Configure parameters to generate the depreciation schedule')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Depreciation Method */}
          <div className="space-y-2">
            <Label>{t('assets.depreciation.method', 'Depreciation Method')}</Label>
            <Controller
              name="depreciation_method"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPRECIATION_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {t(method.labelKey, method.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {selectedMethod && (
              <p className="text-xs text-muted-foreground">
                {t(selectedMethod.descKey, '')}
              </p>
            )}
          </div>

          {/* Period Type */}
          <div className="space-y-2">
            <Label>{t('assets.depreciation.periodType', 'Period Type')}</Label>
            <Controller
              name="period_type"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_TYPES.map(period => (
                      <SelectItem key={period.value} value={period.value}>
                        {t(period.labelKey, period.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>{t('assets.depreciation.startDate', 'Start Date')}</Label>
            <Input
              type="date"
              {...form.register('start_date')}
            />
          </div>

          {/* Financial Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('assets.depreciation.purchasePrice', 'Purchase Price')}</Label>
              <Input
                type="number"
                value={purchasePrice || ''}
                onChange={(e) => form.setValue('purchase_price', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('assets.depreciation.salvageValue', 'Salvage Value')}</Label>
              <Input
                type="number"
                value={salvageValue || ''}
                onChange={(e) => form.setValue('salvage_value', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Useful Life */}
          <div className="space-y-2">
            <Label>{t('assets.depreciation.usefulLife', 'Useful Life (Years)')}</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={usefulLifeYears || ''}
              onChange={(e) => form.setValue('useful_life_years', parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Declining Balance Rate (only for declining balance method) */}
          {depreciationMethod === 'declining_balance' && (
            <div className="space-y-2">
              <Label>{t('assets.depreciation.decliningRate', 'Declining Balance Rate')}</Label>
              <Input
                type="number"
                step={0.1}
                min={1}
                max={10}
                {...form.register('declining_balance_rate', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                {t('assets.depreciation.decliningRateHint', 'Common values: 1.5 (150%), 2 (200% - Double Declining)')}
              </p>
            </div>
          )}

          {/* Preview */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              <p><strong>{t('assets.depreciation.preview', 'Preview')}:</strong></p>
              <p>{t('assets.depreciation.depreciableAmount', 'Depreciable Amount')}: {depreciableAmount.toLocaleString()}</p>
              {depreciationMethod === 'straight_line' && (
                <p>{t('assets.depreciation.annualDepreciation', 'Annual Depreciation')}: {annualDepreciation.toLocaleString()}</p>
              )}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isGenerating || !purchasePrice}>
            {isGenerating ? t('common.generating', 'Generating...') : t('assets.depreciation.generate', 'Generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useCreateKPITarget, KPI_METADATA, AVAILABLE_KPI_CODES, KPITargetAdmin } from '@/hooks/use-kpi-targets-admin';

interface AddKPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTargets: KPITargetAdmin[];
}

const formSchema = z.object({
  kpi_code: z.string().min(1, 'Please select a KPI'),
  target_value: z.coerce.number().min(0, 'Must be 0 or greater'),
  warning_threshold: z.coerce.number().min(0, 'Must be 0 or greater'),
  critical_threshold: z.coerce.number().min(0, 'Must be 0 or greater'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddKPIDialog({ open, onOpenChange, existingTargets }: AddKPIDialogProps) {
  const { t, i18n } = useTranslation();
  const createMutation = useCreateKPITarget();
  const isRTL = i18n.dir() === 'rtl';

  const existingCodes = existingTargets.map(t => t.kpi_code);
  const availableCodes = AVAILABLE_KPI_CODES.filter(code => !existingCodes.includes(code));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpi_code: '',
      target_value: 0,
      warning_threshold: 0,
      critical_threshold: 0,
    },
  });

  const selectedCode = form.watch('kpi_code');
  const selectedMeta = selectedCode ? KPI_METADATA[selectedCode] : null;
  const isLowerBetter = selectedMeta?.comparison_type === 'less_than';

  const onSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync({
      kpi_code: values.kpi_code,
      target_value: values.target_value,
      warning_threshold: values.warning_threshold,
      critical_threshold: values.critical_threshold,
    });
    form.reset();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('kpiAdmin.addTarget', 'Add KPI Target')}</DialogTitle>
          <DialogDescription>
            {t('kpiAdmin.addTargetDescription', 'Configure target values and thresholds for a new KPI')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kpi_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('kpiAdmin.selectKPI', 'Select KPI')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('kpiAdmin.selectKPIPlaceholder', 'Choose a KPI...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCodes.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {t('kpiAdmin.noAvailableKPIs', 'All KPIs have been configured')}
                        </div>
                      ) : (
                        availableCodes.map((code) => {
                          const meta = KPI_METADATA[code];
                          return (
                            <SelectItem key={code} value={code}>
                              <div className="flex items-center gap-2">
                                {meta?.comparison_type === 'less_than' ? (
                                  <TrendingDown className="h-3.5 w-3.5 text-blue-500" />
                                ) : (
                                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                                )}
                                <span>{isRTL ? meta?.nameAr : meta?.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  {selectedMeta && (
                    <FormDescription className="text-xs">
                      {selectedMeta.description}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('kpiAdmin.target', 'Target')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warning_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      {t('kpiAdmin.warning', 'Warning')}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="critical_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {t('kpiAdmin.critical', 'Critical')}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedMeta && (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                {isLowerBetter ? (
                  <p>
                    {t('kpiAdmin.lowerBetterHint', 'For this KPI, lower values are better. Warning triggers when value exceeds warning threshold.')}
                  </p>
                ) : (
                  <p>
                    {t('kpiAdmin.higherBetterHint', 'For this KPI, higher values are better. Warning triggers when value falls below warning threshold.')}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || availableCodes.length === 0}>
                {t('common.add', 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

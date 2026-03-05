import { useTranslation } from 'react-i18next';
import { Calculator, AlertTriangle, Info } from 'lucide-react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  CONTAMINATION_TYPES, RELEASE_SOURCES, RELEASE_CAUSES, HAZARD_CLASSIFICATIONS,
  CONTAINMENT_FAILURE_REASONS, IMPACTED_RECEPTORS, RECOVERY_POTENTIAL, EXPOSURE_TYPES,
  POPULATION_PROXIMITY, APPLICABLE_REGULATIONS, AUTHORITIES, VOLUME_UNITS, WEIGHT_UNITS
} from '@/lib/environmental-contamination-constants';

export function SectionC({ state }: { state: Record<string, unknown> }) {
  const { t, isRTL, form, watchContainmentExists, watchContainmentFailureReason, calculatedFailurePercentage, regulatoryBreachDetected } = state as {
    t: (key: string, fallback?: string) => string;
    isRTL: boolean;
    form: { control: never; watch: (field: string) => string; setValue: (field: string, value: string) => void };
    watchContainmentExists: boolean;
    watchContainmentFailureReason: string | null;
    calculatedFailurePercentage: number | string | null;
    regulatoryBreachDetected: boolean;
  };
  return (
    <AccordionItem value="section-c" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="font-medium">
          {t('investigation.environmentalImpact.sections.secondaryContainment', 'C. Secondary Containment')}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 space-y-4">
        <FormField
          control={form.control}
          name="secondary_containment_exists"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>{t('investigation.environmentalImpact.fields.containmentExists', 'Secondary Containment Exists?')}</FormLabel>
                <FormDescription>
                  {t('investigation.environmentalImpact.descriptions.containmentExists', 'Bund, drip tray, or other containment system')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {watchContainmentExists && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="containment_design_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.environmentalImpact.fields.containmentCapacity', 'Design Capacity')}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="flex-1" />
                      </FormControl>
                      <Select
                        value={form.watch('containment_capacity_unit') || 'liters'}
                        onValueChange={(v) => form.setValue('containment_capacity_unit', v)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(VOLUME_UNITS).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{isRTL ? val.ar : val.en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="containment_retained_volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.environmentalImpact.fields.containmentRetained', 'Actual Retained Volume')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="containment_failure_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.environmentalImpact.fields.containmentFailureReason', 'Failure Reason')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CONTAINMENT_FAILURE_REASONS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {isRTL ? val.ar : val.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {watchContainmentFailureReason === 'other' && (
              <FormField
                control={form.control}
                name="containment_failure_reason_other"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.environmentalImpact.fields.containmentFailureReasonOther', 'Other Reason')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Containment Failure Calculation */}
            {calculatedFailurePercentage && (
              <Alert className={cn(
                'border',
                Number(calculatedFailurePercentage) > 50
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-primary/5 border-primary/20'
              )}>
                <Calculator className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  <span className="font-medium">{t('investigation.environmentalImpact.calculations.failurePercentage', 'Containment Failure')}:</span>
                  <span className={cn('font-bold', Number(calculatedFailurePercentage) > 50 && 'text-destructive')}>
                    {calculatedFailurePercentage}%
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Regulatory Breach Alert */}
            {regulatoryBreachDetected && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('investigation.environmentalImpact.alerts.regulatoryBreach',
                    'Regulatory breach detected: Released volume exceeds containment capacity')}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

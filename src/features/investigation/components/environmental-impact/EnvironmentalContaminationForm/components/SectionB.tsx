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

export function SectionB({ state }: { state: Record<string, unknown> }) {
  const { t, isRTL, form, calculatedVolume } = state as {
    t: (key: string, fallback?: string) => string;
    isRTL: boolean;
    form: { control: never; watch: (field: string) => string; setValue: (field: string, value: string) => void };
    calculatedVolume: number | string | null;
  };
  return (
    <AccordionItem value="section-b" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="font-medium">
          {t('investigation.environmentalImpact.sections.quantitySpread', 'B. Quantity & Spread')}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Volume Released */}
          <FormField
            control={form.control}
            name="volume_released"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.volumeReleased', 'Volume Released')}</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input type="number" step="0.001" {...field} className="flex-1" />
                  </FormControl>
                  <Select
                    value={form.watch('volume_unit') || 'liters'}
                    onValueChange={(v) => form.setValue('volume_unit', v)}
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

          {/* Weight Released */}
          <FormField
            control={form.control}
            name="weight_released"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.weightReleased', 'Weight Released')}</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input type="number" step="0.001" {...field} className="flex-1" />
                  </FormControl>
                  <Select
                    value={form.watch('weight_unit') || 'kg'}
                    onValueChange={(v) => form.setValue('weight_unit', v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WEIGHT_UNITS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{isRTL ? val.ar : val.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Area Affected */}
          <FormField
            control={form.control}
            name="area_affected_sqm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.areaAffected', 'Area Affected (m²)')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Depth */}
          <FormField
            control={form.control}
            name="depth_cm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.depthCm', 'Depth (cm)')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  {t('investigation.environmentalImpact.descriptions.depthForSoil', 'For soil contamination')}
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Exposure Duration */}
          <FormField
            control={form.control}
            name="exposure_duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.exposureDuration', 'Duration (min)')}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Live Calculation Display */}
        {calculatedVolume && (
          <Alert className="bg-primary/5 border-primary/20">
            <Calculator className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <span className="font-medium">{t('investigation.environmentalImpact.calculations.contaminatedVolume', 'Contaminated Volume')}:</span>
              <span className="text-primary font-bold">{calculatedVolume} m³</span>
              <span className="text-xs text-muted-foreground">
                ({t('investigation.environmentalImpact.calculations.contaminatedVolumeFormula', 'Area × Depth')})
              </span>
            </AlertDescription>
          </Alert>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

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

export function SectionA({ state }: { state: Record<string, unknown> }) {
  const { t, isRTL, form, toggleArrayField, watchReleaseCause } = state as {
    t: (key: string, fallback?: string) => string;
    isRTL: boolean;
    form: { control: never };
    toggleArrayField: (field: string, value: string) => void;
    watchReleaseCause: string | null;
  };
  return (
    <AccordionItem value="section-a" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="font-medium">
          {t('investigation.environmentalImpact.sections.contaminationType', 'A. Contamination Type & Source')}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 space-y-4">
        {/* Contamination Types */}
        <FormField
          control={form.control}
          name="contamination_types"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="required">
                {t('investigation.environmentalImpact.fields.contaminationTypes', 'Contamination Types')}
              </FormLabel>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CONTAMINATION_TYPES).map(([key, val]) => (
                  <Badge
                    key={key}
                    variant={field.value?.includes(key) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleArrayField('contamination_types', key)}
                  >
                    {isRTL ? val.ar : val.en}
                  </Badge>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contaminant Name */}
        <FormField
          control={form.control}
          name="contaminant_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="required">
                {t('investigation.environmentalImpact.fields.contaminantName', 'Contaminant Name')}
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('investigation.environmentalImpact.placeholders.contaminantName', 'e.g., Diesel, Crude Oil, Sulfuric Acid')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Contaminant Type */}
          <FormField
            control={form.control}
            name="contaminant_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.contaminantType', 'Material/Product Type')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('investigation.environmentalImpact.placeholders.contaminantType', 'Chemical classification')} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Hazard Classification */}
          <FormField
            control={form.control}
            name="hazard_classification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.hazardClassification', 'Hazard Classification')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.select', 'Select...')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(HAZARD_CLASSIFICATIONS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {isRTL ? val.ar : val.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Release Source */}
          <FormField
            control={form.control}
            name="release_source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.releaseSource', 'Source of Release')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.select', 'Select...')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RELEASE_SOURCES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {isRTL ? val.ar : val.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Release Cause */}
          <FormField
            control={form.control}
            name="release_cause"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.releaseCause', 'Cause of Release')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.select', 'Select...')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RELEASE_CAUSES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {isRTL ? val.ar : val.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        {/* Justification for unknown cause */}
        {watchReleaseCause === 'unknown' && (
          <FormField
            control={form.control}
            name="release_cause_justification"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="required">
                  {t('investigation.environmentalImpact.fields.releaseCauseJustification', 'Justification for Unknown Cause')}
                </FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

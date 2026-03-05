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

export function SectionD({ state }: { state: Record<string, unknown> }) {
  const { t, isRTL, form, toggleArrayField, watchPopulationExposed } = state as {
    t: (key: string, fallback?: string) => string;
    isRTL: boolean;
    form: { control: never };
    toggleArrayField: (field: string, value: string) => void;
    watchPopulationExposed: boolean;
  };
  return (
    <AccordionItem value="section-d" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="font-medium">
          {t('investigation.environmentalImpact.sections.environmentalPopulationImpact', 'D. Environmental & Population Impact')}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 space-y-4">
        {/* Impacted Receptors */}
        <FormField
          control={form.control}
          name="impacted_receptors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investigation.environmentalImpact.fields.impactedReceptors', 'Impacted Environmental Receptors')}</FormLabel>
              <div className="flex flex-wrap gap-2">
                {Object.entries(IMPACTED_RECEPTORS).map(([key, val]) => (
                  <Badge
                    key={key}
                    variant={field.value?.includes(key) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleArrayField('impacted_receptors', key)}
                  >
                    {isRTL ? val.ar : val.en}
                  </Badge>
                ))}
              </div>
            </FormItem>
          )}
        />

        {/* Recovery Potential */}
        <FormField
          control={form.control}
          name="recovery_potential"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investigation.environmentalImpact.fields.recoveryPotential', 'Recovery Potential')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select', 'Select...')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(RECOVERY_POTENTIAL).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {isRTL ? val.ar : val.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Population Exposed */}
        <FormField
          control={form.control}
          name="population_exposed"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>{t('investigation.environmentalImpact.fields.populationExposed', 'Were People Exposed?')}</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {watchPopulationExposed && (
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="population_affected_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.environmentalImpact.fields.populationCount', 'Number Affected')}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exposure_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.environmentalImpact.fields.exposureType', 'Exposure Type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(EXPOSURE_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {isRTL ? val.ar : val.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="population_proximity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.environmentalImpact.fields.populationProximity', 'Population Proximity')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(POPULATION_PROXIMITY).map(([key, val]) => (
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
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

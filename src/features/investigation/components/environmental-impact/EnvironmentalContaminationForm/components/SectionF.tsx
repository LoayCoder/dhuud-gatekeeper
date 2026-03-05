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

export function SectionF({ state }: { state: Record<string, unknown> }) {
  const { t, isRTL, form, toggleArrayField, watchRegulatoryNotification } = state as {
    t: (key: string, fallback?: string) => string;
    isRTL: boolean;
    form: { control: never };
    toggleArrayField: (field: string, value: string) => void;
    watchRegulatoryNotification: boolean;
  };
  return (
    <AccordionItem value="section-f" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="font-medium">
          {t('investigation.environmentalImpact.sections.regulatory', 'F. Regulatory & Compliance')}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 space-y-4">
        <FormField
          control={form.control}
          name="applicable_regulation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investigation.environmentalImpact.fields.applicableRegulation', 'Applicable Regulation Level')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select', 'Select...')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(APPLICABLE_REGULATIONS).map(([key, val]) => (
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
          name="regulatory_notification_required"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>{t('investigation.environmentalImpact.fields.regulatoryNotificationRequired', 'Regulatory Notification Required?')}</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {watchRegulatoryNotification && (
          <>
            <FormField
              control={form.control}
              name="authority_notified"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.environmentalImpact.fields.authorityNotified', 'Authorities Notified')}</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(AUTHORITIES).map(([key, val]) => (
                      <Badge
                        key={key}
                        variant={field.value?.includes(key) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleArrayField('authority_notified', key)}
                      >
                        {isRTL ? val.ar : val.en}
                      </Badge>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="notification_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.environmentalImpact.fields.notificationDate', 'Notification Date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notification_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.environmentalImpact.fields.notificationReference', 'Reference Number')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

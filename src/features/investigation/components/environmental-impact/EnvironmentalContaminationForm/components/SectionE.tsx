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

export function SectionE({ state }: { state: Record<string, unknown> }) {
  const { t, isRTL, form, totalCost } = state as {
    t: (key: string, fallback?: string) => string;
    isRTL: boolean;
    form: { control: never; watch: (field: string) => string };
    totalCost: number;
  };
  return (
    <AccordionItem value="section-e" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="font-medium">
          {t('investigation.environmentalImpact.sections.costEstimation', 'E. Cost Estimation')}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="soil_remediation_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.soilRemediationCost', 'Soil Remediation Cost')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="waste_disposal_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.wasteDisposalCost', 'Waste Disposal Cost')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="testing_analysis_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.testingAnalysisCost', 'Testing & Analysis Cost')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cleanup_contractor_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.cleanupContractorCost', 'Cleanup Contractor Cost')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="regulatory_fines"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.regulatoryFines', 'Regulatory Fines')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.environmentalImpact.fields.costCurrency', 'Currency')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'SAR'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        {/* Total Cost Display */}
        {totalCost > 0 && (
          <Alert className="bg-primary/5 border-primary/20">
            <Calculator className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="font-medium">{t('investigation.environmentalImpact.fields.totalCost', 'Total Environmental Cost')}:</span>
              <span className="font-bold text-lg">
                {new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
                  style: 'currency',
                  currency: form.watch('cost_currency') || 'SAR',
                  minimumFractionDigits: 0,
                }).format(totalCost)}
              </span>
            </AlertDescription>
          </Alert>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

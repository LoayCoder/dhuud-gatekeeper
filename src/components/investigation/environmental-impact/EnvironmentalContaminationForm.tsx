import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calculator, AlertTriangle, Info } from 'lucide-react';
import {
  EnvironmentalContaminationEntry,
  CONTAMINATION_TYPES,
  RELEASE_SOURCES,
  RELEASE_CAUSES,
  HAZARD_CLASSIFICATIONS,
  CONTAINMENT_FAILURE_REASONS,
  IMPACTED_RECEPTORS,
  RECOVERY_POTENTIAL,
  EXPOSURE_TYPES,
  POPULATION_PROXIMITY,
  APPLICABLE_REGULATIONS,
  AUTHORITIES,
  VOLUME_UNITS,
  WEIGHT_UNITS,
} from '@/lib/environmental-contamination-constants';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  // Section A
  contamination_types: z.array(z.string()).min(1, 'Select at least one contamination type'),
  contaminant_name: z.string().min(1, 'Contaminant name is required'),
  contaminant_type: z.string().optional(),
  hazard_classification: z.string().optional(),
  release_source: z.string().optional(),
  release_source_description: z.string().optional(),
  release_cause: z.string().optional(),
  release_cause_justification: z.string().optional(),
  // Section B
  volume_released: z.coerce.number().optional(),
  volume_unit: z.string().optional(),
  weight_released: z.coerce.number().optional(),
  weight_unit: z.string().optional(),
  area_affected_sqm: z.coerce.number().optional(),
  depth_cm: z.coerce.number().optional(),
  exposure_duration_minutes: z.coerce.number().optional(),
  // Section C
  secondary_containment_exists: z.boolean().default(false),
  containment_design_capacity: z.coerce.number().optional(),
  containment_capacity_unit: z.string().optional(),
  containment_retained_volume: z.coerce.number().optional(),
  containment_failure_reason: z.string().optional(),
  containment_failure_reason_other: z.string().optional(),
  // Section D
  impacted_receptors: z.array(z.string()).default([]),
  recovery_potential: z.string().optional(),
  population_exposed: z.boolean().default(false),
  population_affected_count: z.coerce.number().optional(),
  exposure_type: z.string().optional(),
  population_proximity: z.string().optional(),
  // Section E
  soil_remediation_cost: z.coerce.number().optional(),
  waste_disposal_cost: z.coerce.number().optional(),
  testing_analysis_cost: z.coerce.number().optional(),
  cleanup_contractor_cost: z.coerce.number().optional(),
  regulatory_fines: z.coerce.number().optional(),
  cost_currency: z.string().default('SAR'),
  // Section F
  applicable_regulation: z.string().optional(),
  regulatory_notification_required: z.boolean().default(false),
  authority_notified: z.array(z.string()).default([]),
  notification_date: z.string().optional(),
  notification_reference: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EnvironmentalContaminationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: EnvironmentalContaminationEntry | null;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export function EnvironmentalContaminationForm({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isLoading,
}: EnvironmentalContaminationFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [expandedSections, setExpandedSections] = useState<string[]>(['section-a']);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contamination_types: [],
      contaminant_name: '',
      contaminant_type: '',
      hazard_classification: '',
      release_source: '',
      release_cause: '',
      volume_released: undefined,
      volume_unit: 'liters',
      weight_unit: 'kg',
      secondary_containment_exists: false,
      containment_capacity_unit: 'liters',
      impacted_receptors: [],
      population_exposed: false,
      cost_currency: 'SAR',
      regulatory_notification_required: false,
      authority_notified: [],
    },
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      form.reset({
        contamination_types: entry.contamination_types || [],
        contaminant_name: entry.contaminant_name || '',
        contaminant_type: entry.contaminant_type || '',
        hazard_classification: entry.hazard_classification || '',
        release_source: entry.release_source || '',
        release_source_description: entry.release_source_description || '',
        release_cause: entry.release_cause || '',
        release_cause_justification: entry.release_cause_justification || '',
        volume_released: entry.volume_released || undefined,
        volume_unit: entry.volume_unit || 'liters',
        weight_released: entry.weight_released || undefined,
        weight_unit: entry.weight_unit || 'kg',
        area_affected_sqm: entry.area_affected_sqm || undefined,
        depth_cm: entry.depth_cm || undefined,
        exposure_duration_minutes: entry.exposure_duration_minutes || undefined,
        secondary_containment_exists: entry.secondary_containment_exists || false,
        containment_design_capacity: entry.containment_design_capacity || undefined,
        containment_capacity_unit: entry.containment_capacity_unit || 'liters',
        containment_retained_volume: entry.containment_retained_volume || undefined,
        containment_failure_reason: entry.containment_failure_reason || '',
        containment_failure_reason_other: entry.containment_failure_reason_other || '',
        impacted_receptors: entry.impacted_receptors || [],
        recovery_potential: entry.recovery_potential || '',
        population_exposed: entry.population_exposed || false,
        population_affected_count: entry.population_affected_count || undefined,
        exposure_type: entry.exposure_type || '',
        population_proximity: entry.population_proximity || '',
        soil_remediation_cost: entry.soil_remediation_cost || undefined,
        waste_disposal_cost: entry.waste_disposal_cost || undefined,
        testing_analysis_cost: entry.testing_analysis_cost || undefined,
        cleanup_contractor_cost: entry.cleanup_contractor_cost || undefined,
        regulatory_fines: entry.regulatory_fines || undefined,
        cost_currency: entry.cost_currency || 'SAR',
        applicable_regulation: entry.applicable_regulation || '',
        regulatory_notification_required: entry.regulatory_notification_required || false,
        authority_notified: entry.authority_notified || [],
        notification_date: entry.notification_date ? entry.notification_date.split('T')[0] : '',
        notification_reference: entry.notification_reference || '',
      });
    } else {
      form.reset({
        contamination_types: [],
        contaminant_name: '',
        volume_unit: 'liters',
        weight_unit: 'kg',
        secondary_containment_exists: false,
        containment_capacity_unit: 'liters',
        impacted_receptors: [],
        population_exposed: false,
        cost_currency: 'SAR',
        regulatory_notification_required: false,
        authority_notified: [],
      });
    }
  }, [entry, form]);

  const watchVolume = form.watch('volume_released');
  const watchArea = form.watch('area_affected_sqm');
  const watchDepth = form.watch('depth_cm');
  const watchContainmentExists = form.watch('secondary_containment_exists');
  const watchContainmentCapacity = form.watch('containment_design_capacity');
  const watchContainmentRetained = form.watch('containment_retained_volume');
  const watchPopulationExposed = form.watch('population_exposed');
  const watchReleaseCause = form.watch('release_cause');
  const watchContainmentFailureReason = form.watch('containment_failure_reason');
  const watchRegulatoryNotification = form.watch('regulatory_notification_required');

  // Live calculations
  const calculatedVolume = watchArea && watchDepth ? (watchArea * (watchDepth / 100)).toFixed(3) : null;
  const calculatedFailurePercentage = watchVolume && watchVolume > 0 
    ? (((watchVolume - (watchContainmentRetained || 0)) / watchVolume) * 100).toFixed(1)
    : null;
  const regulatoryBreachDetected = watchContainmentExists && watchContainmentCapacity && watchVolume && watchVolume > watchContainmentCapacity;

  const totalCost = (
    (form.watch('soil_remediation_cost') || 0) +
    (form.watch('waste_disposal_cost') || 0) +
    (form.watch('testing_analysis_cost') || 0) +
    (form.watch('cleanup_contractor_cost') || 0) +
    (form.watch('regulatory_fines') || 0)
  );

  const handleSubmit = async (data: FormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const toggleArrayField = (field: 'contamination_types' | 'impacted_receptors' | 'authority_notified', value: string) => {
    const current = form.getValues(field) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    form.setValue(field, updated, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {entry 
              ? t('investigation.environmentalImpact.editEntry', 'Edit Contamination Entry')
              : t('investigation.environmentalImpact.addEntry', 'Add Contamination Entry')
            }
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-6">
              <Accordion 
                type="multiple" 
                value={expandedSections} 
                onValueChange={setExpandedSections}
                className="space-y-2"
              >
                {/* Section A: Contamination Type & Source */}
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

                {/* Section B: Quantity & Spread */}
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

                {/* Section C: Secondary Containment */}
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

                {/* Section D: Environmental & Population Impact */}
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

                {/* Section E: Cost Estimation */}
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

                {/* Section F: Regulatory & Compliance */}
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
              </Accordion>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {entry ? t('common.update', 'Update') : t('common.add', 'Add')}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

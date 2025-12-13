import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Leaf, Droplets, Wind, AlertTriangle, Building2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  useEnvironmentalDetails, 
  useCreateEnvironmentalDetails, 
  useUpdateEnvironmentalDetails,
  type EnvironmentalDetailsInsert 
} from '@/hooks/use-environmental-details';
import { useAuth } from '@/contexts/AuthContext';

const environmentalSchema = z.object({
  substance_type: z.string().optional(),
  substance_name: z.string().optional(),
  cas_number: z.string().optional(),
  spill_volume_liters: z.number().optional(),
  spill_unit: z.string().optional(),
  affected_area_sqm: z.number().optional(),
  affected_medium: z.array(z.string()).optional(),
  containment_successful: z.boolean().optional(),
  containment_method: z.string().optional(),
  cleanup_required: z.boolean().optional(),
  cleanup_contractor: z.string().optional(),
  estimated_cleanup_cost_sar: z.number().optional(),
  actual_cleanup_cost_sar: z.number().optional(),
  cleanup_completed: z.boolean().optional(),
  regulatory_notification_required: z.boolean().optional(),
  regulatory_agency: z.string().optional(),
  regulatory_reference_number: z.string().optional(),
  reportable_quantity_exceeded: z.boolean().optional(),
  reached_waterway: z.boolean().optional(),
  waterway_name: z.string().optional(),
  emission_type: z.string().optional(),
  estimated_emission_kg: z.number().optional(),
  emission_duration_hours: z.number().optional(),
});

type EnvironmentalFormValues = z.infer<typeof environmentalSchema>;

const SUBSTANCE_TYPES = [
  { value: 'chemical', labelKey: 'environmental.substanceTypes.chemical' },
  { value: 'fuel', labelKey: 'environmental.substanceTypes.fuel' },
  { value: 'oil', labelKey: 'environmental.substanceTypes.oil' },
  { value: 'wastewater', labelKey: 'environmental.substanceTypes.wastewater' },
  { value: 'gas', labelKey: 'environmental.substanceTypes.gas' },
  { value: 'other', labelKey: 'environmental.substanceTypes.other' },
];

const AFFECTED_MEDIA = [
  { value: 'soil', labelKey: 'environmental.affectedMedia.soil' },
  { value: 'water', labelKey: 'environmental.affectedMedia.water' },
  { value: 'air', labelKey: 'environmental.affectedMedia.air' },
  { value: 'groundwater', labelKey: 'environmental.affectedMedia.groundwater' },
];

const EMISSION_TYPES = [
  { value: 'fugitive', labelKey: 'environmental.emissionTypes.fugitive' },
  { value: 'stack', labelKey: 'environmental.emissionTypes.stack' },
  { value: 'flare', labelKey: 'environmental.emissionTypes.flare' },
  { value: 'venting', labelKey: 'environmental.emissionTypes.venting' },
];

interface EnvironmentalDetailsSectionProps {
  incidentId: string;
  readOnly?: boolean;
}

export function EnvironmentalDetailsSection({ incidentId, readOnly = false }: EnvironmentalDetailsSectionProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();

  const { data: existingDetails, isLoading } = useEnvironmentalDetails(incidentId);
  const createDetails = useCreateEnvironmentalDetails();
  const updateDetails = useUpdateEnvironmentalDetails();

  const form = useForm<EnvironmentalFormValues>({
    resolver: zodResolver(environmentalSchema),
    defaultValues: {
      affected_medium: [],
      containment_successful: false,
      cleanup_required: false,
      cleanup_completed: false,
      regulatory_notification_required: false,
      reportable_quantity_exceeded: false,
      reached_waterway: false,
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingDetails) {
      form.reset({
        substance_type: existingDetails.substance_type || undefined,
        substance_name: existingDetails.substance_name || undefined,
        cas_number: existingDetails.cas_number || undefined,
        spill_volume_liters: existingDetails.spill_volume_liters || undefined,
        spill_unit: existingDetails.spill_unit || undefined,
        affected_area_sqm: existingDetails.affected_area_sqm || undefined,
        affected_medium: existingDetails.affected_medium || [],
        containment_successful: existingDetails.containment_successful || false,
        containment_method: existingDetails.containment_method || undefined,
        cleanup_required: existingDetails.cleanup_required || false,
        cleanup_contractor: existingDetails.cleanup_contractor || undefined,
        estimated_cleanup_cost_sar: existingDetails.estimated_cleanup_cost_sar || undefined,
        actual_cleanup_cost_sar: existingDetails.actual_cleanup_cost_sar || undefined,
        cleanup_completed: existingDetails.cleanup_completed || false,
        regulatory_notification_required: existingDetails.regulatory_notification_required || false,
        regulatory_agency: existingDetails.regulatory_agency || undefined,
        regulatory_reference_number: existingDetails.regulatory_reference_number || undefined,
        reportable_quantity_exceeded: existingDetails.reportable_quantity_exceeded || false,
        reached_waterway: existingDetails.reached_waterway || false,
        waterway_name: existingDetails.waterway_name || undefined,
        emission_type: existingDetails.emission_type || undefined,
        estimated_emission_kg: existingDetails.estimated_emission_kg || undefined,
        emission_duration_hours: existingDetails.emission_duration_hours || undefined,
      });
    }
  }, [existingDetails, form]);

  const handleSave = async (values: EnvironmentalFormValues) => {
    if (!profile?.tenant_id) return;

    if (existingDetails?.id) {
      await updateDetails.mutateAsync({ id: existingDetails.id, ...values });
    } else {
      await createDetails.mutateAsync({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        ...values,
      } as EnvironmentalDetailsInsert);
    }
  };

  // Auto-save on blur
  const handleBlur = () => {
    if (!readOnly) {
      form.handleSubmit(handleSave)();
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-green-600" />
          {t('environmental.title', 'Environmental Details')}
        </CardTitle>
        <CardDescription>
          {t('environmental.description', 'Capture specific details about the environmental incident')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onBlur={handleBlur} className="space-y-6">
            <Accordion type="multiple" defaultValue={['spill', 'containment']} className="w-full">
              {/* Spill/Release Information */}
              <AccordionItem value="spill">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    {t('environmental.spillInfo', 'Spill/Release Information')}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="substance_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('environmental.substanceType', 'Substance Type')}</FormLabel>
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            disabled={readOnly}
                            dir={direction}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('environmental.selectSubstanceType', 'Select type')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SUBSTANCE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {t(type.labelKey, type.value)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="substance_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('environmental.substanceName', 'Substance Name')}</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={readOnly} placeholder={t('environmental.substanceNamePlaceholder', 'e.g., Diesel fuel')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cas_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('environmental.casNumber', 'CAS Number')}</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={readOnly} placeholder="e.g., 68476-34-6" />
                          </FormControl>
                          <FormDescription>{t('environmental.casNumberHint', 'Chemical Abstracts Service registry number')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="spill_volume_liters"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>{t('environmental.spillVolume', 'Spill Volume')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="spill_unit"
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel>{t('environmental.unit', 'Unit')}</FormLabel>
                            <Select value={field.value || 'liters'} onValueChange={field.onChange} disabled={readOnly}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="liters">{t('environmental.liters', 'Liters')}</SelectItem>
                                <SelectItem value="gallons">{t('environmental.gallons', 'Gallons')}</SelectItem>
                                <SelectItem value="barrels">{t('environmental.barrels', 'Barrels')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="affected_area_sqm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('environmental.affectedArea', 'Affected Area (m²)')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ''}
                              onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              disabled={readOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="affected_medium"
                    render={() => (
                      <FormItem>
                        <FormLabel>{t('environmental.affectedMedium', 'Affected Medium')}</FormLabel>
                        <div className="flex flex-wrap gap-4">
                          {AFFECTED_MEDIA.map((medium) => (
                            <FormField
                              key={medium.value}
                              control={form.control}
                              name="affected_medium"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(medium.value)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        field.onChange(
                                          checked
                                            ? [...current, medium.value]
                                            : current.filter((v) => v !== medium.value)
                                        );
                                      }}
                                      disabled={readOnly}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {t(medium.labelKey, medium.value)}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="reached_waterway"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>{t('environmental.reachedWaterway', 'Reached Waterway?')}</FormLabel>
                            <FormDescription>{t('environmental.reachedWaterwayHint', 'Did the spill reach any water body?')}</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('reached_waterway') && (
                      <FormField
                        control={form.control}
                        name="waterway_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('environmental.waterwayName', 'Waterway Name')}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={readOnly} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Containment & Cleanup */}
              <AccordionItem value="containment">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    {t('environmental.containmentCleanup', 'Containment & Cleanup')}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="containment_successful"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>{t('environmental.containmentSuccessful', 'Containment Successful?')}</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="containment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('environmental.containmentMethod', 'Containment Method')}</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={readOnly} placeholder={t('environmental.containmentMethodPlaceholder', 'e.g., Berms, absorbents')} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cleanup_required"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>{t('environmental.cleanupRequired', 'Cleanup Required?')}</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('cleanup_required') && (
                      <>
                        <FormField
                          control={form.control}
                          name="cleanup_contractor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('environmental.cleanupContractor', 'Cleanup Contractor')}</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={readOnly} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="estimated_cleanup_cost_sar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('environmental.estimatedCleanupCost', 'Estimated Cleanup Cost (SAR)')}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  disabled={readOnly}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="actual_cleanup_cost_sar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('environmental.actualCleanupCost', 'Actual Cleanup Cost (SAR)')}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  disabled={readOnly}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cleanup_completed"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <FormLabel>{t('environmental.cleanupCompleted', 'Cleanup Completed?')}</FormLabel>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Regulatory Notification */}
              <AccordionItem value="regulatory">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    {t('environmental.regulatoryNotification', 'Regulatory Notification')}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="regulatory_notification_required"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>{t('environmental.notificationRequired', 'Notification Required?')}</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reportable_quantity_exceeded"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>{t('environmental.reportableQuantityExceeded', 'Reportable Quantity Exceeded?')}</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('regulatory_notification_required') && (
                      <>
                        <FormField
                          control={form.control}
                          name="regulatory_agency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('environmental.regulatoryAgency', 'Regulatory Agency')}</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={readOnly} placeholder={t('environmental.regulatoryAgencyPlaceholder', 'e.g., NCM, GAMEP')} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="regulatory_reference_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('environmental.referenceNumber', 'Reference Number')}</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={readOnly} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Air Emissions */}
              <AccordionItem value="emissions">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-sky-500" />
                    {t('environmental.airEmissions', 'Air Emissions')}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="emission_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('environmental.emissionType', 'Emission Type')}</FormLabel>
                          <Select value={field.value || ''} onValueChange={field.onChange} disabled={readOnly} dir={direction}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('environmental.selectEmissionType', 'Select type')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EMISSION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {t(type.labelKey, type.value)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_emission_kg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('environmental.estimatedEmission', 'Estimated Emission (kg)')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ''}
                              onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              disabled={readOnly}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emission_duration_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('environmental.emissionDuration', 'Duration (hours)')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ''}
                              onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              disabled={readOnly}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

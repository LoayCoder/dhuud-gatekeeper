import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  PROPERTY_TYPES,
  DAMAGE_SEVERITY,
  OPERATIONAL_IMPACT,
  REPAIR_STATUS,
  type PropertyTypeCode,
  type DamageSeverityCode,
  type OperationalImpactCode,
  type RepairStatusCode,
} from '@/lib/property-damage-constants';
import type { IncidentPropertyDamage, CreateIncidentPropertyDamageInput } from '@/hooks/use-incident-property-damages';

const formSchema = z.object({
  property_name: z.string().min(1, 'Property name is required'),
  property_type: z.enum(['equipment', 'vehicle', 'structure', 'infrastructure', 'material', 'other']).optional().nullable(),
  asset_tag: z.string().optional().nullable(),
  location_description: z.string().optional().nullable(),
  damage_date: z.date().optional().nullable(),
  damage_description: z.string().optional().nullable(),
  damage_severity: z.enum(['minor', 'moderate', 'major', 'total_loss']).optional().nullable(),
  repair_cost_estimate: z.number().min(0).optional().nullable(),
  replacement_cost_estimate: z.number().min(0).optional().nullable(),
  cost_currency: z.string().default('SAR'),
  cost_assessment_by: z.string().optional().nullable(),
  cost_assessment_date: z.date().optional().nullable(),
  operational_impact: z.enum(['none', 'minimal', 'moderate', 'significant', 'critical']).optional().nullable(),
  downtime_hours: z.number().min(0).default(0),
  safety_hazard_created: z.boolean().default(false),
  safety_hazard_description: z.string().optional().nullable(),
  repair_status: z.enum(['pending', 'in_progress', 'completed', 'not_repairable']).default('pending'),
  repair_completed_date: z.date().optional().nullable(),
  actual_repair_cost: z.number().min(0).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface PropertyDamageEntryFormProps {
  incidentId: string;
  initialData?: IncidentPropertyDamage;
  onSubmit: (data: CreateIncidentPropertyDamageInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PropertyDamageEntryForm({
  incidentId,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: PropertyDamageEntryFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_name: initialData?.property_name || '',
      property_type: initialData?.property_type || null,
      asset_tag: initialData?.asset_tag || '',
      location_description: initialData?.location_description || '',
      damage_date: initialData?.damage_date ? new Date(initialData.damage_date) : null,
      damage_description: initialData?.damage_description || '',
      damage_severity: initialData?.damage_severity || null,
      repair_cost_estimate: initialData?.repair_cost_estimate || null,
      replacement_cost_estimate: initialData?.replacement_cost_estimate || null,
      cost_currency: initialData?.cost_currency || 'SAR',
      cost_assessment_by: initialData?.cost_assessment_by || '',
      cost_assessment_date: initialData?.cost_assessment_date ? new Date(initialData.cost_assessment_date) : null,
      operational_impact: initialData?.operational_impact || null,
      downtime_hours: initialData?.downtime_hours || 0,
      safety_hazard_created: initialData?.safety_hazard_created || false,
      safety_hazard_description: initialData?.safety_hazard_description || '',
      repair_status: initialData?.repair_status || 'pending',
      repair_completed_date: initialData?.repair_completed_date ? new Date(initialData.repair_completed_date) : null,
      actual_repair_cost: initialData?.actual_repair_cost || null,
    },
  });

  const watchSafetyHazard = form.watch('safety_hazard_created');
  const watchRepairStatus = form.watch('repair_status');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({
      incident_id: incidentId,
      property_name: data.property_name,
      property_type: data.property_type || null,
      asset_tag: data.asset_tag || null,
      location_description: data.location_description || null,
      damage_date: data.damage_date?.toISOString() || null,
      damage_description: data.damage_description || null,
      damage_severity: data.damage_severity || null,
      repair_cost_estimate: data.repair_cost_estimate || null,
      replacement_cost_estimate: data.replacement_cost_estimate || null,
      cost_currency: data.cost_currency,
      cost_assessment_by: data.cost_assessment_by || null,
      cost_assessment_date: data.cost_assessment_date?.toISOString() || null,
      operational_impact: data.operational_impact || null,
      downtime_hours: data.downtime_hours,
      safety_hazard_created: data.safety_hazard_created,
      safety_hazard_description: data.safety_hazard_description || null,
      repair_status: data.repair_status,
      repair_completed_date: data.repair_completed_date?.toISOString() || null,
      actual_repair_cost: data.actual_repair_cost || null,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Section 1: Property Identification */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            {t('investigation.propertyDamage.sections.propertyIdentification', 'Property Identification')}
          </h4>
          
          <FormField
            control={form.control}
            name="property_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.propertyDamage.fields.propertyName', 'Property Name')} *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('investigation.propertyDamage.placeholders.propertyName', 'e.g., Forklift FL-102')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="property_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.propertyType', 'Property Type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PROPERTY_TYPES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {isRTL ? value.ar : value.en}
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
              name="asset_tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.assetTag', 'Asset Tag')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder={t('investigation.propertyDamage.placeholders.assetTag', 'e.g., ASSET-001')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="location_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.propertyDamage.fields.locationDescription', 'Location')}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder={t('investigation.propertyDamage.placeholders.location', 'e.g., Warehouse B, Section 3')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Section 2: Damage Details */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            {t('investigation.propertyDamage.sections.damageDetails', 'Damage Details')}
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="damage_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('investigation.propertyDamage.fields.damageDate', 'Damage Date')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full ps-3 text-start font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : t('common.selectDate', 'Select date')}
                          <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="damage_severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.damageSeverity', 'Severity')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DAMAGE_SEVERITY).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {isRTL ? value.ar : value.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="damage_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.propertyDamage.fields.damageDescription', 'Damage Description')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    placeholder={t('investigation.propertyDamage.placeholders.damageDescription', 'Describe the damage in detail...')}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Section 3: Cost Estimation */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            {t('investigation.propertyDamage.sections.costEstimation', 'Cost Estimation')}
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="repair_cost_estimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.repairCostEstimate', 'Repair Cost Estimate')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="replacement_cost_estimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.replacementCostEstimate', 'Replacement Cost Estimate')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="cost_assessment_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.costAssessmentBy', 'Assessed By')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder={t('investigation.propertyDamage.placeholders.assessedBy', 'e.g., John Smith, Property Assessor')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost_assessment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('investigation.propertyDamage.fields.costAssessmentDate', 'Assessment Date')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full ps-3 text-start font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : t('common.selectDate', 'Select date')}
                          <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Section 4: Impact Assessment */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            {t('investigation.propertyDamage.sections.impactAssessment', 'Impact Assessment')}
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="operational_impact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.operationalImpact', 'Operational Impact')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(OPERATIONAL_IMPACT).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {isRTL ? value.ar : value.en}
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
              name="downtime_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.downtimeHours', 'Downtime (hours)')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="safety_hazard_created"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>{t('investigation.propertyDamage.fields.safetyHazardCreated', 'Safety Hazard Created')}</FormLabel>
                  <FormDescription>
                    {t('investigation.propertyDamage.descriptions.safetyHazard', 'Did this damage create any safety hazards?')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {watchSafetyHazard && (
            <FormField
              control={form.control}
              name="safety_hazard_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.safetyHazardDescription', 'Hazard Description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      placeholder={t('investigation.propertyDamage.placeholders.hazardDescription', 'Describe the safety hazard created...')}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Separator />

        {/* Section 5: Resolution Tracking */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            {t('investigation.propertyDamage.sections.resolutionTracking', 'Resolution Tracking')}
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="repair_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.repairStatus', 'Repair Status')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(REPAIR_STATUS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {isRTL ? value.ar : value.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchRepairStatus === 'completed' && (
              <FormField
                control={form.control}
                name="repair_completed_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('investigation.propertyDamage.fields.repairCompletedDate', 'Repair Completed Date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full ps-3 text-start font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : t('common.selectDate', 'Select date')}
                            <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {watchRepairStatus === 'completed' && (
            <FormField
              control={form.control}
              name="actual_repair_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.propertyDamage.fields.actualRepairCost', 'Actual Repair Cost')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

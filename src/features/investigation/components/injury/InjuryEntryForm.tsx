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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PersonLookup } from './PersonLookup';
import { BodyDiagramCanvas } from './BodyDiagramCanvas';
import {
  INJURY_TYPES,
  INJURY_SEVERITY,
  RECORDER_ROLES,
  DEFAULT_BODY_DIAGRAM_DATA,
  type BodyDiagramData,
  type InjuryTypeCode,
  type InjurySeverityCode,
  type RecorderRoleCode,
} from '@/lib/body-parts-constants';
import type { IncidentInjury, CreateIncidentInjuryInput } from '@/features/incidents';

const formSchema = z.object({
  person_type: z.enum(['employee', 'contractor', 'visitor', 'public'], { required_error: 'Person type is required' }),
  involvement_type: z.enum(['injured_person', 'witness', 'driver', 'suspect'], { required_error: 'Involvement type is required' }),
  injury_classification: z.enum(['LTI', 'MTC', 'RWC', 'FAC', 'FAT', 'NM']).optional().nullable(),
  injured_person_name: z.string().min(1, 'Name is required'),
  national_id: z.string().optional().nullable(),
  is_platform_user: z.boolean().default(false),
  linked_user_id: z.string().optional().nullable(),
  linked_contractor_worker_id: z.string().optional().nullable(),
  injury_date: z.date().optional().nullable(),
  injury_severity: z.enum(['minor', 'moderate', 'severe', 'critical']).optional().nullable(),
  injury_type: z.array(z.string()).default([]),
  injury_description: z.string().optional().nullable(),
  body_diagram_data: z.any().default(DEFAULT_BODY_DIAGRAM_DATA),
  first_aid_provided: z.boolean().default(false),
  first_aid_description: z.string().optional().nullable(),
  medical_attention_required: z.boolean().default(false),
  hospitalized: z.boolean().default(false),
  days_lost: z.number().min(0).default(0),
  restricted_duty_days: z.number().min(0).default(0),
  recorder_role: z.enum(['investigator', 'medical_staff', 'first_aider']).optional().nullable(),
}).refine((data) => {
  // injury_classification is required when involvement_type is 'injured_person'
  if (data.involvement_type === 'injured_person' && !data.injury_classification) {
    return false;
  }
  return true;
}, {
  message: 'Injury classification is required for injured persons',
  path: ['injury_classification'],
});

type FormData = z.infer<typeof formSchema>;

interface InjuryEntryFormProps {
  incidentId: string;
  initialData?: IncidentInjury;
  onSubmit: (data: CreateIncidentInjuryInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InjuryEntryForm({
  incidentId,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: InjuryEntryFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      person_type: initialData?.person_type || 'employee',
      involvement_type: initialData?.involvement_type || 'injured_person',
      injury_classification: initialData?.injury_classification || null,
      injured_person_name: initialData?.injured_person_name || '',
      national_id: initialData?.national_id || '',
      is_platform_user: initialData?.is_platform_user || false,
      linked_user_id: initialData?.linked_user_id || null,
      linked_contractor_worker_id: initialData?.linked_contractor_worker_id || null,
      injury_date: initialData?.injury_date ? new Date(initialData.injury_date) : null,
      injury_severity: initialData?.injury_severity || null,
      injury_type: initialData?.injury_type || [],
      injury_description: initialData?.injury_description || '',
      body_diagram_data: initialData?.body_diagram_data || DEFAULT_BODY_DIAGRAM_DATA,
      first_aid_provided: initialData?.first_aid_provided || false,
      first_aid_description: initialData?.first_aid_description || '',
      medical_attention_required: initialData?.medical_attention_required || false,
      hospitalized: initialData?.hospitalized || false,
      days_lost: initialData?.days_lost || 0,
      restricted_duty_days: initialData?.restricted_duty_days || 0,
      recorder_role: initialData?.recorder_role || null,
    },
  });

  const handlePersonSelect = (person: { id: string; type: 'user' | 'contractor'; name: string; nationalId?: string | null } | null) => {
    if (person) {
      form.setValue('injured_person_name', person.name);
      form.setValue('national_id', person.nationalId || '');
      form.setValue('is_platform_user', person.type === 'user');
      form.setValue('linked_user_id', person.type === 'user' ? person.id : null);
      form.setValue('linked_contractor_worker_id', person.type === 'contractor' ? person.id : null);
    } else {
      form.setValue('is_platform_user', false);
      form.setValue('linked_user_id', null);
      form.setValue('linked_contractor_worker_id', null);
    }
  };

  const watchInvolvementType = form.watch('involvement_type');

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({
      incident_id: incidentId,
      person_type: data.person_type,
      involvement_type: data.involvement_type,
      injury_classification: data.involvement_type === 'injured_person' ? (data.injury_classification || null) : null,
      injured_person_name: data.injured_person_name,
      national_id: data.national_id || null,
      is_platform_user: data.is_platform_user,
      linked_user_id: data.linked_user_id || null,
      linked_contractor_worker_id: data.linked_contractor_worker_id || null,
      injury_date: data.injury_date?.toISOString() || null,
      injury_severity: data.injury_severity || null,
      injury_type: data.injury_type.length > 0 ? data.injury_type : null,
      injury_description: data.injury_description || null,
      body_parts_affected: extractBodyPartsFromDiagram(data.body_diagram_data),
      body_diagram_data: data.body_diagram_data,
      first_aid_provided: data.first_aid_provided,
      first_aid_description: data.first_aid_description || null,
      medical_attention_required: data.medical_attention_required,
      hospitalized: data.hospitalized,
      days_lost: data.days_lost,
      restricted_duty_days: data.restricted_duty_days,
      recorder_role: data.recorder_role || null,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Person Details Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">
            {t('investigation.injuries.personDetails', 'Person Details')}
          </h3>

          {/* Person Type & Involvement Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="person_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.injuries.fields.personType', 'Person Type')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="employee">{isRTL ? 'Ù…ÙˆØ¸Ù' : 'Employee'}</SelectItem>
                      <SelectItem value="contractor">{isRTL ? 'Ù…Ù‚Ø§ÙˆÙ„' : 'Contractor'}</SelectItem>
                      <SelectItem value="visitor">{isRTL ? 'Ø²Ø§Ø¦Ø±' : 'Visitor'}</SelectItem>
                      <SelectItem value="public">{isRTL ? 'Ø¬Ù…Ù‡ÙˆØ±' : 'Public'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="involvement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.injuries.fields.involvementType', 'Involvement Type')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="injured_person">{isRTL ? 'Ø´Ø®Øµ Ù…ØµØ§Ø¨' : 'Injured Person'}</SelectItem>
                      <SelectItem value="witness">{isRTL ? 'Ø´Ø§Ù‡Ø¯' : 'Witness'}</SelectItem>
                      <SelectItem value="driver">{isRTL ? 'Ø³Ø§Ø¦Ù‚' : 'Driver'}</SelectItem>
                      <SelectItem value="suspect">{isRTL ? 'Ù…Ø´ØªØ¨Ù‡ Ø¨Ù‡' : 'Suspect'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Injury Classification - only when injured_person */}
          {watchInvolvementType === 'injured_person' && (
            <FormField
              control={form.control}
              name="injury_classification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.injuries.fields.injuryClassification', 'Injury Classification (OSHA)')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FAT">{isRTL ? 'ÙˆÙØ§Ø© (FAT)' : 'Fatality (FAT)'}</SelectItem>
                      <SelectItem value="LTI">{isRTL ? 'Ø¥ØµØ§Ø¨Ø© Ø¨ÙÙ‚Ø¯Ø§Ù† ÙˆÙ‚Øª (LTI)' : 'Lost Time Injury (LTI)'}</SelectItem>
                      <SelectItem value="RWC">{isRTL ? 'Ø­Ø§Ù„Ø© Ø¹Ù…Ù„ Ù…Ù‚ÙŠØ¯ (RWC)' : 'Restricted Work Case (RWC)'}</SelectItem>
                      <SelectItem value="MTC">{isRTL ? 'Ø­Ø§Ù„Ø© Ø¹Ù„Ø§Ø¬ Ø·Ø¨ÙŠ (MTC)' : 'Medical Treatment Case (MTC)'}</SelectItem>
                      <SelectItem value="FAC">{isRTL ? 'Ø­Ø§Ù„Ø© Ø¥Ø³Ø¹Ø§ÙØ§Øª Ø£ÙˆÙ„ÙŠØ© (FAC)' : 'First Aid Case (FAC)'}</SelectItem>
                      <SelectItem value="NM">{isRTL ? 'Ø­Ø§Ø¯Ø« ÙˆØ´ÙŠÙƒ (NM)' : 'Near Miss (NM)'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Person Lookup */}
          <div className="space-y-2">
            <Label>{t('investigation.injuries.searchPerson', 'Search Existing Person')}</Label>
            <PersonLookup
              value={{
                id: form.watch('linked_user_id') || form.watch('linked_contractor_worker_id'),
                type: form.watch('is_platform_user') ? 'user' : form.watch('linked_contractor_worker_id') ? 'contractor' : null,
                name: form.watch('injured_person_name'),
              }}
              onSelect={handlePersonSelect}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="injured_person_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.injuries.fields.personName', 'Person Name')} *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="national_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.injuries.fields.nationalId', 'National ID')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Injury Details Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">
            {t('investigation.injuries.injuryDetails', 'Injury Details')}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="injury_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('investigation.injuries.fields.injuryDate', 'Injury Date/Time')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          type="button"
                          className={cn(
                            "w-full justify-start text-start font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP') : t('common.selectDate', 'Select date')}
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
              name="injury_severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.injuries.fields.injurySeverity', 'Injury Severity')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select...')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(INJURY_SEVERITY).map(([code, data]) => (
                        <SelectItem key={code} value={code}>
                          {isRTL ? data.ar : data.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Injury Types (Multi-select) */}
          <FormField
            control={form.control}
            name="injury_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.injuries.fields.injuryType', 'Injury Type(s)')}</FormLabel>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {Object.entries(INJURY_TYPES).map(([code, data]) => (
                    <div key={code} className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Checkbox
                        id={`injury-type-${code}`}
                        checked={field.value?.includes(code)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...field.value, code]);
                          } else {
                            field.onChange(field.value.filter((v: string) => v !== code));
                          }
                        }}
                      />
                      <Label htmlFor={`injury-type-${code}`} className="text-sm cursor-pointer">
                        {isRTL ? data.ar : data.en}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="injury_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investigation.injuries.fields.description', 'Description')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    rows={3}
                    placeholder={t('investigation.injuries.descriptionPlaceholder', 'Describe the injury in detail...')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Body Diagram Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">
            {t('investigation.injuries.bodyDiagram', 'Body Diagram')}
          </h3>

          <FormField
            control={form.control}
            name="body_diagram_data"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BodyDiagramCanvas
                    value={field.value as BodyDiagramData}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Treatment Info Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">
            {t('investigation.injuries.treatmentInfo', 'Treatment Information')}
          </h3>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="first_aid_provided"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t('investigation.injuries.fields.firstAidProvided', 'First Aid Provided')}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('first_aid_provided') && (
              <FormField
                control={form.control}
                name="first_aid_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.injuries.fields.firstAidDescription', 'First Aid Description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="medical_attention_required"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm">{t('investigation.injuries.fields.medicalAttention', 'Medical Attention')}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hospitalized"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm">{t('investigation.injuries.fields.hospitalized', 'Hospitalized')}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="days_lost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.injuries.fields.daysLost', 'Lost Work Days')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="restricted_duty_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.injuries.fields.restrictedDays', 'Restricted Duty Days')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Recorder Info */}
        <FormField
          control={form.control}
          name="recorder_role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investigation.injuries.fields.recorderRole', 'Recorded By (Role)')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select', 'Select...')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(RECORDER_ROLES).map(([code, data]) => (
                    <SelectItem key={code} value={code}>
                      {isRTL ? data.ar : data.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? t('common.saving', 'Saving...')
              : initialData
                ? t('common.update', 'Update')
                : t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Helper to extract body parts from diagram data
function extractBodyPartsFromDiagram(data: BodyDiagramData): string[] | null {
  const parts = new Set<string>();
  
  for (const view of ['front', 'back', 'left', 'right'] as const) {
    for (const marker of data[view] || []) {
      if (marker.bodyPart) {
        parts.add(marker.bodyPart);
      }
    }
  }

  return parts.size > 0 ? Array.from(parts) : null;
}


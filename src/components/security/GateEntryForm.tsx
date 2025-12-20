import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VisitorIdScanner } from '@/components/visitors/VisitorIdScanner';
import { useCreateGateEntry, useSendWhatsAppNotification } from '@/hooks/use-gate-entries';
import { useSites } from '@/hooks/use-sites';
import { Car, User, Phone, Building2, MessageSquare, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const VISIT_DURATION_OPTIONS = [
  { value: 1, labelKey: 'security.gate.duration1h', label: '1 hour' },
  { value: 2, labelKey: 'security.gate.duration2h', label: '2 hours' },
  { value: 4, labelKey: 'security.gate.duration4h', label: '4 hours' },
  { value: 8, labelKey: 'security.gate.durationFullDay', label: 'Full day' },
  { value: 24, labelKey: 'security.gate.duration24h', label: '24 hours' },
];

const formSchema = z.object({
  person_name: z.string().min(2, 'Name is required'),
  entry_type: z.enum(['visitor', 'contractor', 'delivery', 'vip', 'employee']),
  car_plate: z.string().optional(),
  mobile_number: z.string().optional(),
  nationality: z.string().optional(),
  purpose: z.string().optional(),
  destination_name: z.string().optional(),
  site_id: z.string().optional(),
  passenger_count: z.number().min(1).default(1),
  visit_duration_hours: z.number().min(1).max(24).default(1),
  notes: z.string().optional(),
  send_whatsapp: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const ENTRY_TYPES = [
  { value: 'visitor', labelKey: 'security.entryTypes.visitor' },
  { value: 'contractor', labelKey: 'security.entryTypes.contractor' },
  { value: 'delivery', labelKey: 'security.entryTypes.delivery' },
  { value: 'vip', labelKey: 'security.entryTypes.vip' },
  { value: 'employee', labelKey: 'security.entryTypes.employee' },
];

export function GateEntryForm() {
  const { t } = useTranslation();
  const createEntry = useCreateGateEntry();
  const sendWhatsApp = useSendWhatsAppNotification();
  const { data: sites } = useSites();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      person_name: '',
      entry_type: 'visitor',
      car_plate: '',
      mobile_number: '',
      nationality: '',
      purpose: '',
      destination_name: '',
      site_id: '',
      passenger_count: 1,
      visit_duration_hours: 1,
      notes: '',
      send_whatsapp: false,
    },
  });

  const handleIdScan = (scannedValue: string) => {
    // Parse scanned ID - format varies by country
    // For now, just set it as nationality field or parse if structured
    form.setValue('nationality', scannedValue);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const entry = await createEntry.mutateAsync({
        person_name: values.person_name,
        entry_type: values.entry_type,
        car_plate: values.car_plate || null,
        mobile_number: values.mobile_number || null,
        nationality: values.nationality || null,
        purpose: values.purpose || null,
        destination_name: values.destination_name || null,
        site_id: values.site_id || null,
        passenger_count: values.passenger_count,
        visit_duration_hours: values.visit_duration_hours,
        notes: values.notes || null,
      });

      if (values.send_whatsapp && values.mobile_number) {
        await sendWhatsApp.mutateAsync({
          entryId: entry.id,
          visitorName: values.person_name,
          phoneNumber: values.mobile_number,
          siteName: sites?.find(s => s.id === values.site_id)?.name,
          destinationName: values.destination_name,
          visitDurationHours: values.visit_duration_hours,
          notes: values.notes,
        });
      }

      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {t('security.gate.newEntry', 'New Gate Entry')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Person Name with ID Scanner */}
              <FormField
                control={form.control}
                name="person_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.gate.personName', 'Person Name')} *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder={t('security.gate.enterName', 'Enter full name')} {...field} />
                      </FormControl>
                      <VisitorIdScanner onScan={handleIdScan} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Entry Type */}
              <FormField
                control={form.control}
                name="entry_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.gate.entryType', 'Entry Type')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ENTRY_TYPES.map(type => (
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

              {/* Car Plate */}
              <FormField
                control={form.control}
                name="car_plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Car className="h-4 w-4" />
                      {t('security.gate.carPlate', 'Car Plate')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('security.gate.enterPlate', 'Enter plate number')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mobile Number */}
              <FormField
                control={form.control}
                name="mobile_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {t('security.gate.mobileNumber', 'Mobile Number')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+966 5XX XXX XXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Site */}
              <FormField
                control={form.control}
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {t('security.gate.site', 'Site')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select', 'Select...')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites?.map(site => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Destination */}
              <FormField
                control={form.control}
                name="destination_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.gate.destination', 'Destination')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('security.gate.enterDestination', 'Building/Department')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Passenger Count */}
              <FormField
                control={form.control}
                name="passenger_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t('security.gate.passengerCount', 'Passengers')}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nationality */}
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.gate.nationality', 'Nationality')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('security.gate.enterNationality', 'Enter nationality')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Visit Duration */}
              <FormField
                control={form.control}
                name="visit_duration_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.gate.visitDuration', 'Visit Duration')}</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VISIT_DURATION_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {t(option.labelKey, option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Purpose */}
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.gate.purpose', 'Purpose of Visit')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('security.gate.enterPurpose', 'Describe the purpose of the visit')} 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.gate.notes', 'Notes')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('security.gate.enterNotes', 'Additional notes')} 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* WhatsApp Toggle */}
            <FormField
              control={form.control}
              name="send_whatsapp"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <div>
                      <FormLabel className="mb-0">{t('security.gate.sendWhatsapp', 'Send WhatsApp Notification')}</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {t('security.gate.whatsappHint', 'Notify host about visitor arrival')}
                      </p>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!form.watch('mobile_number')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting 
                ? t('common.saving', 'Saving...') 
                : t('security.gate.recordEntry', 'Record Entry')
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

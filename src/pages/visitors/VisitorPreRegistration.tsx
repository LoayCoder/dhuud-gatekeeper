import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserPlus, Clock, CheckCircle2, Building2, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useCreateVisitor } from '@/hooks/use-visitors';
import { useCreateVisitRequest } from '@/hooks/use-visit-requests';
import { useSites } from '@/hooks/use-sites';
import { useProfilesList } from '@/hooks/use-profiles-list';
import { useAuth } from '@/contexts/AuthContext';
import { VisitorIdScanner } from '@/components/visitors/VisitorIdScanner';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DURATION_OPTIONS = [
  { value: '10', label: '10 minutes', minutes: 10 },
  { value: '30', label: '30 minutes', minutes: 30 },
  { value: '60', label: '1 hour', minutes: 60 },
  { value: '120', label: '2 hours', minutes: 120 },
  { value: '240', label: '4 hours', minutes: 240 },
  { value: '480', label: '8 hours', minutes: 480 },
];

const formSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(8, 'Valid phone number is required').optional().or(z.literal('')),
  company_name: z.string().optional(),
  national_id: z.string().optional(),
  site_id: z.string().min(1, 'Site is required'),
  valid_from: z.string().min(1, 'Start date is required'),
  duration_minutes: z.string().min(1, 'Duration is required'),
  notes: z.string().optional(),
  // User type and host fields
  user_type: z.enum(['internal', 'external']),
  host_id: z.string().optional(),
  host_name: z.string().optional(),
  host_phone: z.string().optional(),
  host_email: z.string().email().optional().or(z.literal('')),
}).refine((data) => {
  // For internal users, host_id is required
  if (data.user_type === 'internal') {
    return !!data.host_id;
  }
  // For external users, host_name and host_phone are required
  return !!data.host_name && !!data.host_phone;
}, {
  message: 'Host information is required',
  path: ['host_id'],
});

type FormValues = z.infer<typeof formSchema>;

export default function VisitorPreRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [submittedVisitorName, setSubmittedVisitorName] = useState('');
  
  const { data: sites } = useSites();
  const { data: profiles } = useProfilesList();
  const createVisitor = useCreateVisitor();
  const createVisitRequest = useCreateVisitRequest();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      company_name: '',
      national_id: '',
      site_id: '',
      valid_from: new Date().toISOString().slice(0, 16),
      duration_minutes: '60',
      notes: '',
      user_type: 'external',
      host_id: '',
      host_name: '',
      host_phone: '',
      host_email: '',
    },
  });

  const userType = form.watch('user_type');
  const validFrom = form.watch('valid_from');
  const selectedHostId = form.watch('host_id');

  // When host is selected from internal users, populate host fields
  useEffect(() => {
    if (userType === 'internal' && selectedHostId && profiles) {
      const selectedProfile = profiles.find(p => p.id === selectedHostId);
      if (selectedProfile) {
        form.setValue('host_name', selectedProfile.full_name);
        form.setValue('host_phone', selectedProfile.phone_number || '');
        form.setValue('host_email', selectedProfile.email || '');
      }
    }
  }, [selectedHostId, userType, profiles, form]);

  // Calculate available duration options based on valid_from
  const availableDurations = useMemo(() => {
    if (!validFrom) return DURATION_OPTIONS;
    
    const selectedDate = new Date(validFrom);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const remainingMinutes = Math.floor((endOfDay.getTime() - selectedDate.getTime()) / (1000 * 60));
    
    return DURATION_OPTIONS.filter(option => option.minutes <= remainingMinutes);
  }, [validFrom]);

  // Auto-adjust duration when valid_from changes
  useEffect(() => {
    const currentDuration = form.getValues('duration_minutes');
    const isCurrentValid = availableDurations.some(d => d.value === currentDuration);
    
    if (!isCurrentValid && availableDurations.length > 0) {
      // Select the largest available duration
      const maxDuration = availableDurations[availableDurations.length - 1];
      form.setValue('duration_minutes', maxDuration.value);
    }
  }, [availableDurations, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const validFromDate = new Date(values.valid_from);
      const durationMinutes = parseInt(values.duration_minutes, 10);
      const validUntilDate = new Date(validFromDate.getTime() + durationMinutes * 60 * 1000);

      // Create the visitor with host information (QR code generated but not shown until approved)
      const visitor = await createVisitor.mutateAsync({
        full_name: values.full_name,
        phone: values.phone || null,
        company_name: values.company_name || null,
        national_id: values.national_id || null,
        user_type: values.user_type,
        host_id: values.user_type === 'internal' ? values.host_id : null,
        host_name: values.host_name || null,
        host_phone: values.host_phone || null,
        host_email: values.host_email || null,
      });

      // Create the visit request (pending security approval)
      await createVisitRequest.mutateAsync({
        visitor_id: visitor.id,
        host_id: values.user_type === 'internal' ? values.host_id! : user?.id ?? '',
        site_id: values.site_id,
        valid_from: values.valid_from,
        valid_until: validUntilDate.toISOString(),
        security_notes: values.notes || null,
      });

      setSubmittedVisitorName(values.full_name);
      setRequestSubmitted(true);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleIdScan = (scannedValue: string) => {
    form.setValue('national_id', scannedValue);
  };

  if (requestSubmitted) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <CardTitle>{t('visitors.register.requestSubmitted', 'Request Submitted')}</CardTitle>
            <CardDescription>{t('visitors.register.pendingApproval', 'Your visit request is pending security approval')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="font-medium mb-4">{submittedVisitorName}</p>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {t('visitors.register.approvalMessage', 'Once approved, the visitor will receive their QR access code and the host will be notified via WhatsApp.')}
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setRequestSubmitted(false);
                form.reset();
              }}>
                {t('visitors.register.registerAnother')}
              </Button>
              <Button className="flex-1" onClick={() => navigate('/visitors')}>
                {t('visitors.register.backToDashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/visitors')}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('visitors.register.title')}</h1>
          <p className="text-muted-foreground">{t('visitors.register.description')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('visitors.register.form.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* User Type Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('visitors.register.sections.userType', 'Visitor Type')}</h3>
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div>
                            <RadioGroupItem
                              value="external"
                              id="external"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="external"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <Building2 className="mb-3 h-6 w-6" />
                              <span className="font-medium">{t('visitors.userType.external', 'External Visitor')}</span>
                              <span className="text-xs text-muted-foreground text-center mt-1">
                                {t('visitors.userType.externalDesc', 'No platform access')}
                              </span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="internal"
                              id="internal"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="internal"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <User className="mb-3 h-6 w-6" />
                              <span className="font-medium">{t('visitors.userType.internal', 'Internal User')}</span>
                              <span className="text-xs text-muted-foreground text-center mt-1">
                                {t('visitors.userType.internalDesc', 'Has platform access')}
                              </span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Visitor Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('visitors.register.sections.visitor')}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.name')} *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('visitors.placeholders.name')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.phone', 'Mobile Number')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="tel" 
                            placeholder={t('visitors.placeholders.phone', 'Enter mobile number')} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.company')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('visitors.placeholders.company')} />
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
                        <FormLabel>{t('visitors.fields.nationalId')}</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} placeholder={t('visitors.placeholders.nationalId')} />
                          </FormControl>
                          <VisitorIdScanner onScan={handleIdScan} />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Host Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('visitors.register.sections.host', 'Host Information')}</h3>
                
                {userType === 'internal' ? (
                  <FormField
                    control={form.control}
                    name="host_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.hostUser', 'Select Host')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('visitors.placeholders.selectHost', 'Select a host from the organization')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {profiles?.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                <div className="flex flex-col">
                                  <span>{profile.full_name}</span>
                                  {profile.job_title && (
                                    <span className="text-xs text-muted-foreground">{profile.job_title}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t('visitors.fields.hostUserDesc', 'The internal user who will host this visitor')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="host_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('visitors.fields.hostName', 'Host Name')} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('visitors.placeholders.hostName', 'Enter host name')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="host_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('visitors.fields.hostPhone', 'Host Mobile')} *</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder={t('visitors.placeholders.hostPhone', 'For WhatsApp notification')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="host_email"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{t('visitors.fields.hostEmail', 'Host Email')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder={t('visitors.placeholders.hostEmail', 'Optional email address')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Visit Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('visitors.register.sections.visit')}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="site_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.site')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('visitors.placeholders.site')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sites?.map((site) => (
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
                  <FormField
                    control={form.control}
                    name="valid_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.validFrom')} *</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.duration', 'Visit Duration')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('visitors.placeholders.duration', 'Select duration')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableDurations.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {t(`visitors.duration.${option.value}`, option.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {availableDurations.length < DURATION_OPTIONS.length && (
                          <FormDescription className="text-amber-600">
                            {t('visitors.duration.limitedByTime', 'Duration options limited by selected start time')}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('visitors.fields.notes')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('visitors.placeholders.notes')} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/visitors')}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createVisitor.isPending || createVisitRequest.isPending}>
                  <Clock className="me-2 h-4 w-4" />
                  {createVisitor.isPending ? t('common.loading') : t('visitors.register.submitRequest', 'Submit Request')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

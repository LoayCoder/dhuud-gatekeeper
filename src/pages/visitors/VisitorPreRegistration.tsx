import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserPlus, Clock, CheckCircle2, Building2, User, ShieldAlert, Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useCreateVisitor } from '@/hooks/use-visitors';
import { useCreateVisitRequest } from '@/hooks/use-visit-requests';
import { useSites } from '@/hooks/use-sites';
import { useProfilesList } from '@/hooks/use-profiles-list';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckBlacklist } from '@/hooks/use-security-blacklist';
import { VisitorIdScanner } from '@/components/visitors/VisitorIdScanner';
import { VisitorPhotoCapture } from '@/components/security/VisitorPhotoCapture';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useVisitorWorkflowSettings } from '@/hooks/use-visitor-workflow-settings';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  company_name: z.string().min(1, 'Company name is required'),
  national_id: z.string().min(1, 'National ID is required'),
  site_id: z.string().min(1, 'Site is required'),
  // Separate date and time fields
  start_date: z.string().min(1, 'Start date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_date: z.string().min(1, 'End date is required'),
  end_time: z.string().min(1, 'End time is required'),
  notes: z.string().min(1, 'Purpose of visit is required'),
  // User type and host fields
  user_type: z.enum(['internal', 'external']),
  host_id: z.string().optional(),
  host_name: z.string().optional(),
  host_phone: z.string().optional(),
  host_email: z.string().email('Valid email is required'),
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
}).refine((data) => {
  // Validate end datetime is after start datetime
  const startDateTime = new Date(`${data.start_date}T${data.start_time}`);
  const endDateTime = new Date(`${data.end_date}T${data.end_time}`);
  return endDateTime > startDateTime;
}, {
  message: 'End date/time must be after start date/time',
  path: ['end_time'],
});

type FormValues = z.infer<typeof formSchema>;

// Helper to get current date in YYYY-MM-DD format
const getCurrentDate = () => new Date().toISOString().split('T')[0];

// Helper to get current time in HH:MM format
const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// Helper to get end date (default: same day)
const getDefaultEndTime = () => {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export default function VisitorPreRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [submittedVisitorName, setSubmittedVisitorName] = useState('');
  const [visitorPhoto, setVisitorPhoto] = useState<Blob | null>(null);
  
  const { data: sites } = useSites();
  const { data: profiles } = useProfilesList();
  const { data: workflowSettings } = useVisitorWorkflowSettings();
  const createVisitor = useCreateVisitor();
  const createVisitRequest = useCreateVisitRequest();

  // Calculate default end time based on workflow settings
  const getDefaultEndTime = () => {
    const now = new Date();
    const hoursToAdd = workflowSettings?.default_duration_hours || 1;
    now.setHours(now.getHours() + hoursToAdd);
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      company_name: '',
      national_id: '',
      site_id: '',
      start_date: getCurrentDate(),
      start_time: getCurrentTime(),
      end_date: getCurrentDate(),
      end_time: getDefaultEndTime(),
      notes: '',
      user_type: 'external',
      host_id: '',
      host_name: '',
      host_phone: '',
      host_email: '',
    },
  });

  // Update end time when workflow settings load
  useEffect(() => {
    if (workflowSettings?.default_duration_hours) {
      form.setValue('end_time', getDefaultEndTime());
    }
  }, [workflowSettings?.default_duration_hours]);

  const userType = form.watch('user_type');
  const selectedHostId = form.watch('host_id');
  const nationalId = form.watch('national_id');

  // Check if visitor is blacklisted
  const { data: blacklistEntry, isLoading: checkingBlacklist } = useCheckBlacklist(nationalId || undefined);
  const isBlacklisted = !!blacklistEntry;

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

  const onSubmit = async (values: FormValues) => {
    // Double-check blacklist before submission
    if (isBlacklisted) {
      return;
    }

    // Check if photo is required
    if (workflowSettings?.require_photo && !visitorPhoto) {
      return;
    }

    try {
      const validFromDate = new Date(`${values.start_date}T${values.start_time}`);
      const validUntilDate = new Date(`${values.end_date}T${values.end_time}`);

      // Validate max duration if configured
      if (workflowSettings?.max_visit_duration_hours) {
        const durationHours = (validUntilDate.getTime() - validFromDate.getTime()) / (1000 * 60 * 60);
        if (durationHours > workflowSettings.max_visit_duration_hours) {
          form.setError('end_time', { 
            message: t('visitors.register.maxDurationExceeded', 'Visit duration exceeds maximum allowed ({{hours}} hours)', { hours: workflowSettings.max_visit_duration_hours })
          });
          return;
        }
      }

      // Upload photo if captured
      let photoPath: string | null = null;
      if (visitorPhoto && profile?.tenant_id) {
        const fileName = `${profile.tenant_id}/${Date.now()}-${values.national_id}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('visitor-photos')
          .upload(fileName, visitorPhoto, { contentType: 'image/jpeg' });
        
        if (uploadError) {
          console.error('Photo upload failed:', uploadError);
        } else {
          photoPath = uploadData.path;
        }
      }

      // Create the visitor with host information (QR code generated but not shown until approved)
      const visitor = await createVisitor.mutateAsync({
        full_name: values.full_name,
        phone: values.phone,
        company_name: values.company_name,
        national_id: values.national_id,
        user_type: values.user_type,
        host_id: values.user_type === 'internal' ? values.host_id : null,
        host_name: values.host_name || null,
        host_phone: values.host_phone || null,
        host_email: values.host_email,
        photo_path: photoPath,
      });

      // Determine initial status based on workflow settings
      const shouldAutoApprove = workflowSettings?.auto_approve_internal && values.user_type === 'internal';

      // Create the visit request
      await createVisitRequest.mutateAsync({
        visitor_id: visitor.id,
        host_id: values.user_type === 'internal' ? values.host_id! : user?.id ?? '',
        site_id: values.site_id,
        valid_from: validFromDate.toISOString(),
        valid_until: validUntilDate.toISOString(),
        security_notes: values.notes || null,
        // Note: status will be set by the mutation, but we could pass auto_approve flag if needed
      });

      setSubmittedVisitorName(values.full_name);
      setRequestSubmitted(true);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handlePhotoCapture = (photo: Blob) => {
    setVisitorPhoto(photo);
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
                        <FormLabel>{t('visitors.fields.phone', 'Mobile Number')} *</FormLabel>
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
                        <FormLabel>{t('visitors.fields.company')} *</FormLabel>
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
                        <FormLabel>{t('visitors.fields.nationalId')} *</FormLabel>
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

                {/* Blacklist Alert */}
                {isBlacklisted && (
                  <Alert variant="destructive" className="border-2">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertTitle className="font-bold">
                      {t('visitors.blacklist.cannotRegister', 'Cannot Register')}:
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                      {t('visitors.blacklist.contactSecurity', 'Please contact the Security section for assistance and support.')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Photo Capture - shown when required by workflow settings */}
                {workflowSettings?.require_photo && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      {t('visitors.register.photo', 'Visitor Photo')} *
                    </Label>
                    <div className="flex items-center gap-4">
                      <VisitorPhotoCapture onCapture={handlePhotoCapture} />
                      {visitorPhoto && (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          {t('visitors.register.photoCaptured', 'Photo captured')}
                        </span>
                      )}
                    </div>
                    {workflowSettings?.require_photo && !visitorPhoto && (
                      <p className="text-sm text-destructive">
                        {t('visitors.register.photoRequired', 'Photo is required for registration')}
                      </p>
                    )}
                  </div>
                )}
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
                          <FormLabel>{t('visitors.fields.hostEmail', 'Host Email')} *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder={t('visitors.placeholders.hostEmail', 'Enter email address')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Visit Details with Separate Date/Time Fields */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('visitors.register.sections.visit')}</h3>
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

                {/* Start Date/Time Row */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.startDate', 'Start Date')} *</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.startTime', 'Start Time')} *</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* End Date/Time Row */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.endDate', 'End Date')} *</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.endTime', 'End Time')} *</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" />
                        </FormControl>
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
                      <FormLabel>{t('visitors.fields.notes')} *</FormLabel>
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
                <Button 
                  type="submit" 
                  disabled={
                    createVisitor.isPending || 
                    createVisitRequest.isPending || 
                    isBlacklisted || 
                    checkingBlacklist || 
                    (workflowSettings?.require_photo && !visitorPhoto)
                  }
                >
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

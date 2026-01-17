/**
 * Walk-In Registration Page
 * Quick registration form for visitors who arrive without pre-registration.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ArrowLeft, 
  Camera, 
  UserPlus, 
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateVisitor } from '@/hooks/use-visitors';
import { useIsVisitorBlacklisted } from '@/hooks/use-validate-visitor-access';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { UserSearchCombobox } from '@/components/admin/UserSearchCombobox';
import { VisitorPhotoCapture } from '@/components/security/VisitorPhotoCapture';
import { VisitorBadgePrint } from '@/components/reception/VisitorBadgePrint';

const walkInSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  national_id: z.string().optional(),
  company_name: z.string().optional(),
  purpose: z.string().min(3, 'Please describe the purpose of visit'),
  host_id: z.string().optional(),
  host_name: z.string().optional(),
  host_phone: z.string().optional(),
  host_email: z.string().email().optional().or(z.literal('')),
});

type WalkInFormData = z.infer<typeof walkInSchema>;

export default function WalkInRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [nationalIdToCheck, setNationalIdToCheck] = useState<string>('');
  const [registeredVisitor, setRegisteredVisitor] = useState<any>(null);

  const createVisitor = useCreateVisitor();
  
  // Check blacklist when national ID is entered
  const { data: blacklistEntry, isLoading: checkingBlacklist } = useIsVisitorBlacklisted(
    nationalIdToCheck || undefined
  );

  const form = useForm<WalkInFormData>({
    resolver: zodResolver(walkInSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      national_id: '',
      company_name: '',
      purpose: '',
      host_id: '',
      host_name: '',
      host_phone: '',
      host_email: '',
    },
  });

  const onSubmit = async (data: WalkInFormData) => {
    if (blacklistEntry) {
      return; // Don't allow registration if blacklisted
    }

    try {
      const result = await createVisitor.mutateAsync({
        full_name: data.full_name,
        phone: data.phone || null,
        national_id: data.national_id || null,
        company_name: data.company_name || null,
        host_id: data.host_id || null,
        host_name: data.host_name || null,
        host_phone: data.host_phone || null,
        host_email: data.host_email || null,
        photo_path: null, // Will handle photo upload separately if needed
        user_type: 'external',
      });
      
      setRegisteredVisitor(result);
    } catch (error) {
      console.error('Failed to register visitor:', error);
    }
  };

  const handleNationalIdBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value) {
      setNationalIdToCheck(value);
    }
  };

  const handleHostSelect = (userId: string | null, user: { id: string; full_name: string | null; email: string | null } | null) => {
    if (user) {
      form.setValue('host_id', user.id);
      form.setValue('host_name', user.full_name || '');
      form.setValue('host_email', user.email || '');
    } else {
      form.setValue('host_id', '');
      form.setValue('host_name', '');
      form.setValue('host_email', '');
    }
  };

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
  };

  // Show success screen after registration
  if (registeredVisitor) {
    return (
      <div className="container mx-auto py-6 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl">
              {t('reception.registrationSuccess', 'Visitor Registered Successfully')}
            </CardTitle>
            <CardDescription>
              {t('reception.registrationSuccessDescription', 'The visitor has been registered. You can now print their badge.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common.name', 'Name')}:</span>
                <span className="font-medium">{registeredVisitor.full_name}</span>
              </div>
              {registeredVisitor.company_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.company', 'Company')}:</span>
                  <span>{registeredVisitor.company_name}</span>
                </div>
              )}
              {registeredVisitor.host_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('visitors.host', 'Host')}:</span>
                  <span>{registeredVisitor.host_name}</span>
                </div>
              )}
            </div>

            <VisitorBadgePrint visitor={registeredVisitor} />

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRegisteredVisitor(null);
                  form.reset();
                  setPhotoBlob(null);
                }}
              >
                <UserPlus className="h-4 w-4 me-2" />
                {t('reception.registerAnother', 'Register Another')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate('/reception')}
              >
                {t('reception.backToDashboard', 'Back to Dashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reception')}>
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('reception.walkInRegistration', 'Walk-In Registration')}
          </h1>
          <p className="text-muted-foreground">
            {t('reception.walkInDescription', 'Quick registration for visitors without prior booking')}
          </p>
        </div>
      </div>

      {/* Blacklist Warning */}
      {blacklistEntry && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('security.blacklisted', 'Blacklisted Visitor')}</AlertTitle>
          <AlertDescription>
            {t('security.blacklistWarning', 'This person is on the security blacklist and cannot be registered.')}
            {blacklistEntry.reason && (
              <div className="mt-2">
                <strong>{t('common.reason', 'Reason')}:</strong> {blacklistEntry.reason}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {t('visitors.photo', 'Visitor Photo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <VisitorPhotoCapture onCapture={handlePhotoCapture} />
                {photoBlob && (
                  <Badge variant="secondary">
                    {t('visitors.photoCaptured', 'Photo captured')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('visitors.basicInfo', 'Basic Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.fullName', 'Full Name')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('visitors.enterName', 'Enter full name')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.phone', 'Phone')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="+966..." />
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
                      <FormLabel>{t('visitors.nationalId', 'National ID / Iqama')}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={t('visitors.enterNationalId', 'Enter ID number')}
                          onBlur={handleNationalIdBlur}
                        />
                      </FormControl>
                      {checkingBlacklist && (
                        <p className="text-sm text-muted-foreground">
                          {t('security.checkingBlacklist', 'Checking security blacklist...')}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.company', 'Company')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('visitors.enterCompany', 'Enter company name')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('visitors.purpose', 'Purpose of Visit')} *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t('visitors.enterPurpose', 'Describe the purpose of the visit')}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Host Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('visitors.hostInfo', 'Host Information')}
              </CardTitle>
              <CardDescription>
                {t('visitors.hostDescription', 'Select an employee who will host this visitor')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('visitors.selectHost', 'Select Host Employee')}</Label>
                <UserSearchCombobox
                  value={form.watch('host_id') || null}
                  onSelect={handleHostSelect}
                  placeholder={t('visitors.searchHost', 'Search for host employee...')}
                />
              </div>

              {form.watch('host_name') && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                  <div className="font-medium">{form.watch('host_name')}</div>
                  {form.watch('host_email') && (
                    <div className="text-sm text-muted-foreground">{form.watch('host_email')}</div>
                  )}
                  {form.watch('host_phone') && (
                    <div className="text-sm text-muted-foreground">{form.watch('host_phone')}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/reception')}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createVisitor.isPending || !!blacklistEntry}
            >
              {createVisitor.isPending ? (
                t('common.registering', 'Registering...')
              ) : (
                <>
                  <UserPlus className="h-4 w-4 me-2" />
                  {t('reception.registerVisitor', 'Register Visitor')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

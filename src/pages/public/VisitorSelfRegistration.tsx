/**
 * Visitor Self-Registration Page
 * 
 * Public page for visitors to pre-register before arriving.
 * Multi-step wizard with photo capture and ID upload.
 */
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  useTenantBySlug, 
  useCreateSelfRegistration 
} from '@/hooks/use-visitor-self-registration';
import { 
  User, Building, Phone, Mail, CreditCard, Calendar, 
  Camera, Upload, Check, ChevronLeft, ChevronRight, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['personal', 'photo', 'id_document', 'visit_details', 'confirmation'] as const;
type Step = typeof STEPS[number];

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  company_name: string;
  national_id: string;
  nationality: string;
  photo_path: string;
  id_document_path: string;
  purpose: string;
  expected_visit_date: string;
  expected_visit_time: string;
  host_name: string;
  host_email: string;
  host_department: string;
}

export default function VisitorSelfRegistration() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRTL = i18n.dir() === 'rtl';

  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    phone: '',
    email: '',
    company_name: '',
    national_id: '',
    nationality: '',
    photo_path: '',
    id_document_path: '',
    purpose: '',
    expected_visit_date: '',
    expected_visit_time: '',
    host_name: '',
    host_email: '',
    host_department: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useTenantBySlug(tenantSlug);
  const createRegistration = useCreateSelfRegistration();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  const currentStepIndex = STEPS.indexOf(currentStep);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const tenantId = tenant?.id;

  const handleFileUpload = async (file: File, type: 'photo' | 'id_document') => {
    if (!tenantId) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${type}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('visitor-self-registration')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const field = type === 'photo' ? 'photo_path' : 'id_document_path';
      handleInputChange(field, fileName);
      
      toast({ title: t('common.uploaded', 'File uploaded successfully') });
    } catch (error) {
      toast({ 
        title: t('common.error'), 
        description: (error as Error).message, 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    if (!tenantId) return;

    try {
      await createRegistration.mutateAsync({
        tenant_id: tenantId,
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || undefined,
        company_name: formData.company_name,
        national_id: formData.national_id,
        nationality: formData.nationality || undefined,
        photo_path: formData.photo_path || undefined,
        id_document_path: formData.id_document_path || undefined,
        purpose: formData.purpose || undefined,
        expected_visit_date: formData.expected_visit_date,
        expected_visit_time: formData.expected_visit_time || undefined,
        host_name: formData.host_name || undefined,
        host_email: formData.host_email || undefined,
        host_department: formData.host_department || undefined,
      });
      setIsComplete(true);
    } catch (error) {
      // Error handled in hook
    }
  };

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'personal':
        return formData.full_name && formData.phone && formData.company_name && formData.national_id;
      case 'photo':
        return true; // Photo is optional
      case 'id_document':
        return true; // ID is optional
      case 'visit_details':
        return formData.expected_visit_date;
      case 'confirmation':
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </div>
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">
              {t('visitors.selfRegistration.invalidLink', 'Invalid registration link')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">
                {t('visitors.selfRegistration.successTitle', 'Registration Submitted')}
              </h2>
              <p className="text-muted-foreground">
                {t('visitors.selfRegistration.successMessage', 'Your registration has been submitted. You will receive confirmation once approved.')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language Toggle */}
      <div className="fixed top-4 end-4 z-50">
        <Button variant="outline" size="sm" onClick={toggleLanguage}>
          <Globe className="w-4 h-4 me-2" />
          {i18n.language === 'ar' ? 'English' : 'العربية'}
        </Button>
      </div>

      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          {tenant?.logo_url && (
            <img 
              src={tenant.logo_url} 
              alt={tenant?.name || ''} 
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-bold">
            {tenant?.name || ''}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('visitors.selfRegistration.title', 'Visitor Pre-Registration')}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  index < currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : index === currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  index < currentStepIndex ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 'personal' && t('visitors.selfRegistration.personalInfo', 'Personal Information')}
              {currentStep === 'photo' && t('visitors.selfRegistration.photoCapture', 'Photo')}
              {currentStep === 'id_document' && t('visitors.selfRegistration.idDocument', 'ID Document')}
              {currentStep === 'visit_details' && t('visitors.selfRegistration.visitDetails', 'Visit Details')}
              {currentStep === 'confirmation' && t('visitors.selfRegistration.confirmation', 'Confirmation')}
            </CardTitle>
            <CardDescription>
              {currentStep === 'personal' && t('visitors.selfRegistration.personalInfoDesc', 'Enter your personal details')}
              {currentStep === 'photo' && t('visitors.selfRegistration.photoCaptureDesc', 'Upload a photo (optional)')}
              {currentStep === 'id_document' && t('visitors.selfRegistration.idDocumentDesc', 'Upload your ID document (optional)')}
              {currentStep === 'visit_details' && t('visitors.selfRegistration.visitDetailsDesc', 'Provide details about your visit')}
              {currentStep === 'confirmation' && t('visitors.selfRegistration.confirmationDesc', 'Review and submit your registration')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Personal Info Step */}
            {currentStep === 'personal' && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">
                      {t('common.fullName', 'Full Name')} *
                    </Label>
                    <div className="relative">
                      <User className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      {t('common.phone', 'Phone')} *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('common.email', 'Email')}</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="ps-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">
                      {t('common.company', 'Company')} *
                    </Label>
                    <div className="relative">
                      <Building className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="national_id">
                      {t('visitors.nationalId', 'National ID')} *
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="national_id"
                        value={formData.national_id}
                        onChange={(e) => handleInputChange('national_id', e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">
                      {t('visitors.nationality', 'Nationality')}
                    </Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Photo Step */}
            {currentStep === 'photo' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {formData.photo_path ? (
                    <div className="space-y-4">
                      <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-muted">
                        <img
                          src={`${supabase.storage.from('visitor-self-registration').getPublicUrl(formData.photo_path).data.publicUrl}`}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleInputChange('photo_path', '')}
                      >
                        {t('common.change', 'Change')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {t('visitors.selfRegistration.uploadPhoto', 'Upload your photo')}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="photo-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'photo');
                        }}
                      />
                      <Button
                        variant="outline"
                        asChild
                        disabled={isUploading}
                      >
                        <label htmlFor="photo-upload" className="cursor-pointer">
                          <Upload className="w-4 h-4 me-2" />
                          {isUploading ? t('common.uploading', 'Uploading...') : t('common.upload', 'Upload')}
                        </label>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ID Document Step */}
            {currentStep === 'id_document' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {formData.id_document_path ? (
                    <div className="space-y-4">
                      <div className="max-w-sm mx-auto rounded overflow-hidden bg-muted">
                        <img
                          src={`${supabase.storage.from('visitor-self-registration').getPublicUrl(formData.id_document_path).data.publicUrl}`}
                          alt="ID Preview"
                          className="w-full h-auto"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleInputChange('id_document_path', '')}
                      >
                        {t('common.change', 'Change')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <CreditCard className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {t('visitors.selfRegistration.uploadId', 'Upload your ID document')}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="id-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'id_document');
                        }}
                      />
                      <Button
                        variant="outline"
                        asChild
                        disabled={isUploading}
                      >
                        <label htmlFor="id-upload" className="cursor-pointer">
                          <Upload className="w-4 h-4 me-2" />
                          {isUploading ? t('common.uploading', 'Uploading...') : t('common.upload', 'Upload')}
                        </label>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visit Details Step */}
            {currentStep === 'visit_details' && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expected_visit_date">
                      {t('visitors.visitDate', 'Visit Date')} *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="expected_visit_date"
                        type="date"
                        value={formData.expected_visit_date}
                        onChange={(e) => handleInputChange('expected_visit_date', e.target.value)}
                        className="ps-10"
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_visit_time">
                      {t('visitors.visitTime', 'Visit Time')}
                    </Label>
                    <Input
                      id="expected_visit_time"
                      type="time"
                      value={formData.expected_visit_time}
                      onChange={(e) => handleInputChange('expected_visit_time', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">
                    {t('visitors.purpose', 'Purpose of Visit')}
                  </Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="host_name">
                      {t('visitors.hostName', 'Host Name')}
                    </Label>
                    <Input
                      id="host_name"
                      value={formData.host_name}
                      onChange={(e) => handleInputChange('host_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="host_email">
                      {t('visitors.hostEmail', 'Host Email')}
                    </Label>
                    <Input
                      id="host_email"
                      type="email"
                      value={formData.host_email}
                      onChange={(e) => handleInputChange('host_email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="host_department">
                    {t('visitors.hostDepartment', 'Host Department')}
                  </Label>
                  <Input
                    id="host_department"
                    value={formData.host_department}
                    onChange={(e) => handleInputChange('host_department', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Confirmation Step */}
            {currentStep === 'confirmation' && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.fullName', 'Full Name')}</p>
                    <p className="font-medium">{formData.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.phone', 'Phone')}</p>
                    <p className="font-medium">{formData.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.company', 'Company')}</p>
                    <p className="font-medium">{formData.company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('visitors.nationalId', 'National ID')}</p>
                    <p className="font-medium">{formData.national_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('visitors.visitDate', 'Visit Date')}</p>
                    <p className="font-medium">{formData.expected_visit_date}</p>
                  </div>
                  {formData.expected_visit_time && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('visitors.visitTime', 'Visit Time')}</p>
                      <p className="font-medium">{formData.expected_visit_time}</p>
                    </div>
                  )}
                </div>

                {formData.purpose && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('visitors.purpose', 'Purpose')}</p>
                    <p className="font-medium">{formData.purpose}</p>
                  </div>
                )}

                {formData.host_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('visitors.host', 'Host')}</p>
                    <p className="font-medium">{formData.host_name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={goToPrevStep}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 me-2 rtl:rotate-180" />
                {t('common.previous', 'Previous')}
              </Button>

              {currentStep === 'confirmation' ? (
                <Button
                  onClick={handleSubmit}
                  disabled={createRegistration.isPending}
                >
                  {createRegistration.isPending ? (
                    t('common.submitting', 'Submitting...')
                  ) : (
                    t('common.submit', 'Submit')
                  )}
                </Button>
              ) : (
                <Button
                  onClick={goToNextStep}
                  disabled={!canProceed()}
                >
                  {t('common.next', 'Next')}
                  <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

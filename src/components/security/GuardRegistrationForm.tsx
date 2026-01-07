import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, User, MapPin, CheckCircle, ChevronRight, ChevronLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface GuardRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  full_name: string;
  email: string;
  employee_id: string;
  phone_number: string;
  assigned_site_id: string;
  job_title: string;
}

const initialFormData: FormData = {
  full_name: '',
  email: '',
  employee_id: '',
  phone_number: '',
  assigned_site_id: '',
  job_title: 'Security Guard',
};

export function GuardRegistrationForm({ onSuccess, onCancel }: GuardRegistrationFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Fetch sites for assignment
  const { data: sites } = useQuery({
    queryKey: ['sites-list'],
    queryFn: async () => {
      const { data } = await supabase.from('sites').select('id, name').is('deleted_at', null).order('name');
      return data || [];
    },
  });

  // Get current user's tenant and info
  const { data: currentProfile } = useQuery({
    queryKey: ['current-user-profile-for-guard-registration'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('id, tenant_id').eq('id', user.id).single();
      return { ...data, userId: user.id };
    },
  });

  // Fetch the security_guard role ID
  const { data: securityGuardRole } = useQuery({
    queryKey: ['security-guard-role'],
    queryFn: async () => {
      const { data } = await supabase
        .from('roles')
        .select('id, code, name')
        .eq('code', 'security_guard')
        .eq('is_active', true)
        .single();
      return data;
    },
  });

  const createGuard = useMutation({
    mutationFn: async (data: FormData) => {
      if (!currentProfile?.tenant_id) throw new Error('No tenant found');
      if (!securityGuardRole?.id) throw new Error('Security guard role not found');

      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: crypto.randomUUID().slice(0, 16) + 'Aa1!', // Temporary password
        options: {
          data: {
            full_name: data.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          employee_id: data.employee_id,
          phone_number: data.phone_number,
          assigned_site_id: data.assigned_site_id || null,
          job_title: data.job_title,
          tenant_id: currentProfile.tenant_id,
          is_active: true,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Assign security_guard role using user_role_assignments table (correct table!)
      const { error: roleError } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: securityGuardRole.id,
          tenant_id: currentProfile.tenant_id,
          assigned_by: currentProfile.userId,
        });

      if (roleError) throw roleError;

      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-team'] });
      queryClient.invalidateQueries({ queryKey: ['security-team-hierarchy'] });
      toast({ title: t('security.guards.registrationSuccess', 'Guard registered successfully') });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: t('security.guards.registrationFailed', 'Registration failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleNext = () => {
    if (step === 1 && (!formData.full_name || !formData.email)) {
      toast({ title: t('common.requiredFields', 'Please fill required fields'), variant: 'destructive' });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = () => {
    createGuard.mutate(formData);
  };

  const steps = [
    { number: 1, title: t('security.guards.step1', 'Basic Info'), icon: User },
    { number: 2, title: t('security.guards.step2', 'Assignment'), icon: MapPin },
    { number: 3, title: t('security.guards.step3', 'Confirm'), icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                step >= s.number
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              <s.icon className="h-5 w-5" />
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-12 h-0.5 mx-2',
                  step > s.number ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('security.guards.basicInfo', 'Basic Information')}
            </CardTitle>
            <CardDescription>
              {t('security.guards.basicInfoDesc', 'Enter the guard\'s personal details')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.fullName', 'Full Name')} *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t('common.fullNamePlaceholder', 'Enter full name')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.email', 'Email')} *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('common.emailPlaceholder', 'Enter email address')}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.employeeId', 'Employee ID')}</Label>
                <Input
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="EMP-001"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('common.phone', 'Phone Number')}</Label>
                <Input
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+966..."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Site Assignment */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('security.guards.siteAssignment', 'Site Assignment')}
            </CardTitle>
            <CardDescription>
              {t('security.guards.siteAssignmentDesc', 'Assign the guard to a site (optional)')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.site', 'Site')}</Label>
              <Select
                value={formData.assigned_site_id}
                onValueChange={(v) => setFormData({ ...formData, assigned_site_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectSite', 'Select a site...')} />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.jobTitle', 'Job Title')}</Label>
              <Input
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="Security Guard"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {t('security.guards.confirmation', 'Confirmation')}
            </CardTitle>
            <CardDescription>
              {t('security.guards.confirmationDesc', 'Review the guard details before registration')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common.fullName', 'Name')}</span>
                <span className="font-medium">{formData.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common.email', 'Email')}</span>
                <span className="font-medium">{formData.email}</span>
              </div>
              {formData.employee_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.employeeId', 'Employee ID')}</span>
                  <span className="font-medium">{formData.employee_id}</span>
                </div>
              )}
              {formData.phone_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.phone', 'Phone')}</span>
                  <span className="font-medium">{formData.phone_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common.site', 'Site')}</span>
                <span className="font-medium">
                  {sites?.find((s) => s.id === formData.assigned_site_id)?.name || t('common.notAssigned', 'Not assigned')}
                </span>
              </div>
            </div>

            {/* Auto Role Assignment Notice */}
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium text-primary">
                  {t('security.guards.roleAutoAssigned', 'Security Guard role will be automatically assigned')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('security.guards.roleAutoAssignedDesc', 'The user will have security guard permissions upon registration')}
                </p>
              </div>
            </div>

            <Badge variant="secondary" className="gap-2">
              <Shield className="h-4 w-4" />
              {t('security.team.roles.guard', 'Security Guard')}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 me-2 rtl:rotate-180" />
              {t('common.back', 'Back')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext}>
              {t('common.next', 'Next')}
              <ChevronRight className="h-4 w-4 ms-2 rtl:rotate-180" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createGuard.isPending}>
              {createGuard.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  {t('common.registering', 'Registering...')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 me-2" />
                  {t('security.guards.register', 'Register Guard')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

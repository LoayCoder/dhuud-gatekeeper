import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { UserType, isContractorType, userTypeHasLogin } from '@/lib/license-utils';
import { useLicensedUserQuota } from '@/hooks/use-licensed-user-quota';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const userFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  user_type: z.enum(['employee', 'contractor_longterm', 'contractor_shortterm', 'member', 'visitor']),
  has_login: z.boolean().default(true),
  is_active: z.boolean().default(true),
  // Employee fields
  employee_id: z.string().optional(),
  job_title: z.string().optional(),
  // Contractor fields
  contractor_company_name: z.string().optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  // Member fields
  membership_id: z.string().optional(),
  membership_start: z.string().optional(),
  membership_end: z.string().optional(),
  // Hierarchy
  assigned_branch_id: z.string().optional().nullable(),
  assigned_division_id: z.string().optional().nullable(),
  assigned_department_id: z.string().optional().nullable(),
  assigned_section_id: z.string().optional().nullable(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onSave: (data: UserFormValues) => Promise<void>;
}

export function UserFormDialog({ open, onOpenChange, user, onSave }: UserFormDialogProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { quota, checkCanAddUser } = useLicensedUserQuota();
  const [isLoading, setIsLoading] = useState(false);
  const [hierarchy, setHierarchy] = useState<{
    branches: any[];
    divisions: any[];
    departments: any[];
    sections: any[];
  }>({
    branches: [],
    divisions: [],
    departments: [],
    sections: [],
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone_number: '',
      user_type: 'employee',
      has_login: true,
      is_active: true,
      employee_id: '',
      job_title: '',
      contractor_company_name: '',
      contract_start: '',
      contract_end: '',
      membership_id: '',
      membership_start: '',
      membership_end: '',
      assigned_branch_id: null,
      assigned_division_id: null,
      assigned_department_id: null,
      assigned_section_id: null,
    },
  });

  const userType = form.watch('user_type');
  const hasLogin = form.watch('has_login');
  const selectedBranchId = form.watch('assigned_branch_id');
  const selectedDivisionId = form.watch('assigned_division_id');
  const selectedDepartmentId = form.watch('assigned_department_id');

  // Load hierarchy data
  useEffect(() => {
    async function loadHierarchy() {
      if (!profile?.tenant_id) return;

      const [branchesRes, divisionsRes, departmentsRes, sectionsRes] = await Promise.all([
        supabase.from('branches').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('divisions').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('departments').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('sections').select('*').eq('tenant_id', profile.tenant_id),
      ]);

      setHierarchy({
        branches: branchesRes.data || [],
        divisions: divisionsRes.data || [],
        departments: departmentsRes.data || [],
        sections: sectionsRes.data || [],
      });
    }
    loadHierarchy();
  }, [profile?.tenant_id]);

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        user_type: user.user_type || 'employee',
        has_login: user.has_login ?? true,
        is_active: user.is_active ?? true,
        employee_id: user.employee_id || '',
        job_title: user.job_title || '',
        contractor_company_name: user.contractor_company_name || '',
        contract_start: user.contract_start || '',
        contract_end: user.contract_end || '',
        membership_id: user.membership_id || '',
        membership_start: user.membership_start || '',
        membership_end: user.membership_end || '',
        assigned_branch_id: user.assigned_branch_id || null,
        assigned_division_id: user.assigned_division_id || null,
        assigned_department_id: user.assigned_department_id || null,
        assigned_section_id: user.assigned_section_id || null,
      });
    } else {
      form.reset();
    }
  }, [user, form]);

  // Auto-set has_login based on user type
  useEffect(() => {
    const shouldHaveLogin = userTypeHasLogin(userType);
    form.setValue('has_login', shouldHaveLogin);
  }, [userType, form]);

  // Filter departments by division
  const filteredDepartments = hierarchy.departments.filter(
    (d) => !selectedDivisionId || d.division_id === selectedDivisionId
  );

  // Filter sections by department
  const filteredSections = hierarchy.sections.filter(
    (s) => !selectedDepartmentId || s.department_id === selectedDepartmentId
  );

  const onSubmit = async (data: UserFormValues) => {
    // Check quota for new users with login
    if (!user && data.has_login && !checkCanAddUser()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? t('userManagement.editUser') : t('userManagement.addUser')}
          </DialogTitle>
          <DialogDescription>
            {quota && (
              <span className="text-xs">
                {t('userManagement.licensedUsers')}: {quota.current_licensed_users} / {quota.max_licensed_users}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profile.fullName')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profile.phoneNumber')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('userManagement.userType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">{t('userTypes.employee')}</SelectItem>
                        <SelectItem value="contractor_longterm">{t('userTypes.contractorLongterm')}</SelectItem>
                        <SelectItem value="contractor_shortterm">{t('userTypes.contractorShortterm')}</SelectItem>
                        <SelectItem value="member">{t('userTypes.member')}</SelectItem>
                        <SelectItem value="visitor">{t('userTypes.visitor')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Login & Status */}
            <div className="flex items-center gap-8">
              <FormField
                control={form.control}
                name="has_login"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">{t('userManagement.hasLogin')}</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">{t('userManagement.isActive')}</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Employee Fields */}
            {userType === 'employee' && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('userManagement.employeeId')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('userManagement.jobTitle')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Contractor Fields */}
            {isContractorType(userType) && (
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                <FormField
                  control={form.control}
                  name="contractor_company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('userManagement.companyName')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contract_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('userManagement.contractStart')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contract_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('userManagement.contractEnd')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Member Fields */}
            {userType === 'member' && (
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                <FormField
                  control={form.control}
                  name="membership_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('userManagement.membershipId')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="membership_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('userManagement.membershipStart')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="membership_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('userManagement.membershipEnd')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Organizational Hierarchy */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">{t('userManagement.organizationalAssignment')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assigned_branch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('orgStructure.branch')}</FormLabel>
                      <Select 
                        onValueChange={(v) => {
                          field.onChange(v === 'none' ? null : v);
                          form.setValue('assigned_division_id', null);
                          form.setValue('assigned_department_id', null);
                          form.setValue('assigned_section_id', null);
                        }} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('common.none')}</SelectItem>
                          {hierarchy.branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigned_division_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('orgStructure.division')}</FormLabel>
                      <Select 
                        onValueChange={(v) => {
                          field.onChange(v === 'none' ? null : v);
                          form.setValue('assigned_department_id', null);
                          form.setValue('assigned_section_id', null);
                        }} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('common.none')}</SelectItem>
                          {hierarchy.divisions.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigned_department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('orgStructure.department')}</FormLabel>
                      <Select 
                        onValueChange={(v) => {
                          field.onChange(v === 'none' ? null : v);
                          form.setValue('assigned_section_id', null);
                        }} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('common.none')}</SelectItem>
                          {filteredDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigned_section_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('orgStructure.section')}</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('common.none')}</SelectItem>
                          {filteredSections.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

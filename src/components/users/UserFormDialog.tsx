import React, { useState, useEffect, useMemo } from 'react';
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
import { Label } from '@/components/ui/label';
import { Loader2, Users } from 'lucide-react';
import { UserType, isContractorType, userTypeHasLogin } from '@/lib/license-utils';
import { useLicensedUserQuota } from '@/hooks/use-licensed-user-quota';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoleSelector } from '@/components/roles/RoleSelector';
import { useUserRoles } from '@/hooks/use-user-roles';
import { TeamAssignmentDialog } from '@/components/hierarchy/TeamAssignmentDialog';

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

const RTL_LANGUAGES = ['ar', 'ur'];

export function UserFormDialog({ open, onOpenChange, user, onSave }: UserFormDialogProps) {
  const { t, i18n } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const { quota, checkCanAddUser } = useLicensedUserQuota();
  const { roles, fetchUserRoles, assignRoles } = useUserRoles();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);
  const [currentManagerId, setCurrentManagerId] = useState<string | null>(null);
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const direction = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'text-right' : 'text-left';
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

  // Reset form and load user roles when user changes
  useEffect(() => {
    async function loadUserData() {
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

        // Load user's roles
        const userRoles = await fetchUserRoles(user.id);
        setSelectedRoleIds(userRoles.map(r => r.role_id));

        // Load manager assignment
        const { data: teamAssignment } = await supabase
          .from('manager_team')
          .select('manager_id')
          .eq('user_id', user.id)
          .maybeSingle();
        setCurrentManagerId(teamAssignment?.manager_id || null);
      } else {
        form.reset();
        // Set default normal_user role for new users
        const normalUserRole = roles.find(r => r.code === 'normal_user');
        setSelectedRoleIds(normalUserRole ? [normalUserRole.id] : []);
        setCurrentManagerId(null);
      }
    }
    loadUserData();
  }, [user, form, fetchUserRoles, roles]);

  // Auto-set has_login based on user type
  useEffect(() => {
    const shouldHaveLogin = userTypeHasLogin(userType);
    form.setValue('has_login', shouldHaveLogin);
  }, [userType, form]);

  // Filter departments by selected division (cascade filtering)
  const filteredDepartments = useMemo(() => {
    if (!selectedDivisionId) return [];
    return hierarchy.departments.filter((d) => d.division_id === selectedDivisionId);
  }, [hierarchy.departments, selectedDivisionId]);

  // Filter sections by selected department (cascade filtering)
  const filteredSections = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return hierarchy.sections.filter((s) => s.department_id === selectedDepartmentId);
  }, [hierarchy.sections, selectedDepartmentId]);

  // Clear child selections when parent changes
  useEffect(() => {
    const currentDeptId = form.getValues('assigned_department_id');
    if (currentDeptId && selectedDivisionId) {
      const deptBelongsToDivision = hierarchy.departments.some(
        d => d.id === currentDeptId && d.division_id === selectedDivisionId
      );
      if (!deptBelongsToDivision) {
        form.setValue('assigned_department_id', null);
        form.setValue('assigned_section_id', null);
      }
    }
  }, [selectedDivisionId, hierarchy.departments, form]);

  useEffect(() => {
    const currentSectionId = form.getValues('assigned_section_id');
    if (currentSectionId && selectedDepartmentId) {
      const sectionBelongsToDept = hierarchy.sections.some(
        s => s.id === currentSectionId && s.department_id === selectedDepartmentId
      );
      if (!sectionBelongsToDept) {
        form.setValue('assigned_section_id', null);
      }
    }
  }, [selectedDepartmentId, hierarchy.sections, form]);

  const onSubmit = async (data: UserFormValues) => {
    // Check quota for new users with login
    if (!user && data.has_login && !checkCanAddUser()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave(data);
      
      // Assign roles after save (for existing users we have the ID)
      if (user && profile?.tenant_id) {
        await assignRoles(user.id, selectedRoleIds, profile.tenant_id);
      }
      
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has manager role
  const hasManagerRole = selectedRoleIds.some(roleId => {
    const role = roles.find(r => r.id === roleId);
    return role?.code === 'manager';
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden" dir={direction}>
        <DialogHeader className={textAlign}>
          <DialogTitle className={textAlign}>
            {user ? t('userManagement.editUser') : t('userManagement.addUser')}
          </DialogTitle>
          <DialogDescription className={textAlign}>
            {quota && (
              <span className="text-xs">
                {t('userManagement.licensedUsers')}: {quota.current_licensed_users} / {quota.max_licensed_users}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3" dir={direction}>
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

            <div className="grid grid-cols-2 gap-3" dir={direction}>
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
            <div className="flex items-center gap-6" dir={direction}>
              <FormField
                control={form.control}
                name="has_login"
                render={({ field }) => (
                  <div className="flex flex-row items-center gap-3">
                    <FormLabel className="cursor-pointer m-0">{t('userManagement.hasLogin')}</FormLabel>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex flex-row items-center gap-3">
                    <FormLabel className="cursor-pointer m-0">{t('userManagement.isActive')}</FormLabel>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
            </div>

            {/* Role Assignment (Admin Only) */}
            {isAdmin && (
              <div className="space-y-2 p-3 border rounded-lg" dir={direction}>
                <Label className="font-medium text-start block">{t('roles.roleAssignment')}</Label>
                <p className="text-xs text-muted-foreground mb-2 text-start">{t('roles.roleAssignmentDescription')}</p>
                <RoleSelector
                  selectedRoleIds={selectedRoleIds}
                  onChange={setSelectedRoleIds}
                />
              </div>
            )}

            {/* Team Assignment (Admin Only, for editing existing users) */}
            {isAdmin && user && (
              <div className="space-y-2 p-3 border rounded-lg" dir={direction}>
                <div className="flex items-center justify-between">
                  <div className="text-start">
                    <Label className="font-medium">{t('hierarchy.teamAssignment')}</Label>
                    <p className="text-xs text-muted-foreground">{t('hierarchy.teamAssignmentDescription')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTeamAssignment(true)}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {currentManagerId ? t('hierarchy.changeManager') : t('hierarchy.assignToTeam')}
                  </Button>
                </div>
              </div>
            )}

            {/* Employee Fields */}
            {userType === 'employee' && (
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg" dir={direction}>
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
            <div className="space-y-3 p-3 border rounded-lg" dir={direction}>
              <h4 className="font-medium text-start">{t('userManagement.organizationalAssignment')}</h4>
              <div className="grid grid-cols-2 gap-3">
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

            <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading} className={isRTL ? 'flex-row-reverse' : ''}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Team Assignment Dialog */}
      {user && (
        <TeamAssignmentDialog
          open={showTeamAssignment}
          onOpenChange={setShowTeamAssignment}
          userId={user.id}
          userName={user.full_name || ''}
          currentManagerId={currentManagerId}
          onAssigned={() => {
            // Refresh manager assignment
            supabase
              .from('manager_team')
              .select('manager_id')
              .eq('user_id', user.id)
              .maybeSingle()
              .then(({ data }) => setCurrentManagerId(data?.manager_id || null));
          }}
        />
      )}
    </Dialog>
  );
}

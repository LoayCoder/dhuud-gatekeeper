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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, LogIn, UserX, AlertCircle, AlertTriangle, User, Shield, Building2, Briefcase, Check } from 'lucide-react';
import { UserType, isContractorType, userTypeHasLogin, getUserTypeLabel } from '@/lib/license-utils';
import { cn } from '@/lib/utils';
import { useLicensedUserQuota } from '@/hooks/use-licensed-user-quota';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoleSelectorEnhanced } from '@/components/roles/RoleSelectorEnhanced';
import { useUserRoles } from '@/hooks/use-user-roles';
import { TeamAssignmentDialog } from '@/components/hierarchy/TeamAssignmentDialog';
import { Badge } from '@/components/ui/badge';

const userFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().optional().or(z.literal('')),
  phone_number: z.string().optional(),
  user_type: z.enum(['employee', 'contractor_longterm', 'contractor_shortterm', 'member', 'visitor']),
  has_login: z.boolean().default(true),
  is_active: z.boolean().default(true),
  delivery_channel: z.enum(['email', 'whatsapp', 'both']).default('email'),
  employee_id: z.string().optional(),
  job_title: z.string().optional(),
  contractor_company_name: z.string().optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  membership_id: z.string().optional(),
  membership_start: z.string().optional(),
  membership_end: z.string().optional(),
  has_full_branch_access: z.boolean().default(false),
  assigned_branch_id: z.string().optional().nullable(),
  assigned_division_id: z.string().optional().nullable(),
  assigned_department_id: z.string().optional().nullable(),
  assigned_section_id: z.string().optional().nullable(),
  assigned_site_id: z.string().optional().nullable(),
}).refine((data) => {
  if (data.has_login) {
    if (!data.email || data.email === '') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(data.email);
  }
  return true;
}, {
  message: 'Email is required when login is enabled',
  path: ['email'],
}).refine((data) => {
  if ((data.delivery_channel === 'whatsapp' || data.delivery_channel === 'both') && data.has_login) {
    return data.phone_number && data.phone_number.length > 0;
  }
  return true;
}, {
  message: 'Phone number is required for WhatsApp delivery',
  path: ['phone_number'],
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onSave: (data: UserFormValues, selectedRoleIds: string[], emailChanged: boolean, originalEmail: string | null) => Promise<void>;
}

const userTypeCards = [
  { value: 'employee', icon: '👤', color: 'bg-blue-500/10 border-blue-500/30' },
  { value: 'contractor_longterm', icon: '🔧', color: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'contractor_shortterm', icon: '⚡', color: 'bg-orange-500/10 border-orange-500/30' },
  { value: 'member', icon: '🏅', color: 'bg-purple-500/10 border-purple-500/30' },
  { value: 'visitor', icon: '👋', color: 'bg-gray-500/10 border-gray-500/30' },
];

export function UserFormDialog({ open, onOpenChange, user, onSave }: UserFormDialogProps) {
  const { t, i18n } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const { quota, checkCanAddUser } = useLicensedUserQuota();
  const { roles, fetchUserRoles, assignRoles } = useUserRoles();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);
  const [currentManagerId, setCurrentManagerId] = useState<string | null>(null);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const direction = i18n.dir();
  
  const [hierarchy, setHierarchy] = useState<{
    branches: any[];
    divisions: any[];
    departments: any[];
    sections: any[];
    sites: any[];
  }>({
    branches: [],
    divisions: [],
    departments: [],
    sections: [],
    sites: [],
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
      delivery_channel: 'email',
      employee_id: '',
      job_title: '',
      contractor_company_name: '',
      contract_start: '',
      contract_end: '',
      membership_id: '',
      membership_start: '',
      membership_end: '',
      has_full_branch_access: false,
      assigned_branch_id: null,
      assigned_division_id: null,
      assigned_department_id: null,
      assigned_section_id: null,
      assigned_site_id: null,
    },
  });

  const userType = form.watch('user_type');
  const hasLogin = form.watch('has_login');
  const hasFullBranchAccess = form.watch('has_full_branch_access');
  const selectedBranchId = form.watch('assigned_branch_id');
  const selectedDivisionId = form.watch('assigned_division_id');
  const selectedDepartmentId = form.watch('assigned_department_id');

  // Load hierarchy data
  useEffect(() => {
    async function loadHierarchy() {
      if (!profile?.tenant_id) return;

      const [branchesRes, divisionsRes, departmentsRes, sectionsRes, sitesRes] = await Promise.all([
        supabase.from('branches').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('divisions').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('departments').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('sections').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('sites').select('id, name, branch_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
      ]);

      setHierarchy({
        branches: branchesRes.data || [],
        divisions: divisionsRes.data || [],
        departments: departmentsRes.data || [],
        sections: sectionsRes.data || [],
        sites: sitesRes.data || [],
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
          has_full_branch_access: user.has_full_branch_access ?? false,
          assigned_branch_id: user.assigned_branch_id || null,
          assigned_division_id: user.assigned_division_id || null,
          assigned_department_id: user.assigned_department_id || null,
          assigned_section_id: user.assigned_section_id || null,
          assigned_site_id: user.assigned_site_id || null,
        });

        setOriginalEmail(user.email || null);
        const userRoles = await fetchUserRoles(user.id);
        setSelectedRoleIds(userRoles.map(r => r.role_id));

        const { data: teamAssignment } = await supabase
          .from('manager_team')
          .select('manager_id')
          .eq('user_id', user.id)
          .maybeSingle();
        setCurrentManagerId(teamAssignment?.manager_id || null);
      } else {
        form.reset();
        setOriginalEmail(null);
        const normalUserRole = roles.find(r => r.code === 'normal_user');
        setSelectedRoleIds(normalUserRole ? [normalUserRole.id] : []);
        setCurrentManagerId(null);
      }
      setActiveTab('basic');
    }
    loadUserData();
  }, [user, form, fetchUserRoles, roles]);

  useEffect(() => {
    if (!user) {
      const shouldHaveLogin = userTypeHasLogin(userType);
      form.setValue('has_login', shouldHaveLogin);
    }
  }, [userType, form, user]);

  const filteredDepartments = useMemo(() => {
    if (!selectedDivisionId) return [];
    return hierarchy.departments.filter((d) => d.division_id === selectedDivisionId);
  }, [hierarchy.departments, selectedDivisionId]);

  const filteredSections = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return hierarchy.sections.filter((s) => s.department_id === selectedDepartmentId);
  }, [hierarchy.sections, selectedDepartmentId]);

  // Filter sites by selected branch
  const filteredSites = useMemo(() => {
    if (!selectedBranchId) return hierarchy.sites;
    return hierarchy.sites.filter((s) => s.branch_id === selectedBranchId);
  }, [hierarchy.sites, selectedBranchId]);

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

  const currentEmail = form.watch('email');
  const emailHasChanged = user && originalEmail && currentEmail !== originalEmail;

  const onSubmit = async (data: UserFormValues) => {
    if (!user && data.has_login && !checkCanAddUser()) {
      return;
    }

    setIsLoading(true);
    try {
      const emailChanged = !!(user && originalEmail && data.email !== originalEmail);
      await onSave(data, selectedRoleIds, emailChanged, originalEmail);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const hasManagerRole = selectedRoleIds.some(roleId => {
    const role = roles.find(r => r.id === roleId);
    return role?.code === 'manager';
  });

  // Determine which type-specific tab to show
  const showTypeSpecificTab = userType === 'employee' || isContractorType(userType) || userType === 'member';

  // Tab progress indicators
  const getTabStatus = (tabId: string) => {
    const values = form.getValues();
    switch (tabId) {
      case 'basic':
        return values.full_name && (values.has_login ? values.email : true);
      case 'roles':
        return selectedRoleIds.length > 0;
      case 'organization':
        return values.has_full_branch_access || values.assigned_branch_id;
      case 'details':
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir={direction}>
        <DialogHeader className="text-start pb-2">
          <DialogTitle className="text-start text-xl">
            {user ? t('userManagement.editUser') : t('userManagement.addUser')}
          </DialogTitle>
          <DialogDescription className="text-start">
            {quota && (
              <span className="text-xs">
                {t('userManagement.licensedUsers')}: {quota.current_licensed_users} / {quota.max_licensed_users}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
              {/* Tab Navigation */}
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="basic" className="gap-2 text-xs sm:text-sm">
                  <User className="h-4 w-4 hidden sm:block" />
                  {t('userManagement.tabBasic', 'Basic')}
                  {getTabStatus('basic') && <Check className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="roles" className="gap-2 text-xs sm:text-sm">
                  <Shield className="h-4 w-4 hidden sm:block" />
                  {t('userManagement.tabRoles', 'Roles')}
                  {getTabStatus('roles') && <Check className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="organization" className="gap-2 text-xs sm:text-sm">
                  <Building2 className="h-4 w-4 hidden sm:block" />
                  {t('userManagement.tabOrg', 'Org')}
                </TabsTrigger>
                {showTypeSpecificTab && (
                  <TabsTrigger value="details" className="gap-2 text-xs sm:text-sm">
                    <Briefcase className="h-4 w-4 hidden sm:block" />
                    {t('userManagement.tabDetails', 'Details')}
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tab Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-1">
                {/* Tab 1: Basic Info */}
                <TabsContent value="basic" className="space-y-4 mt-0">
                  {/* User Type Selection - Visual Cards */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('userManagement.userType')}</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {userTypeCards.map(({ value, icon, color }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => form.setValue('user_type', value as UserFormValues['user_type'])}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center",
                            userType === value 
                              ? `${color} border-primary ring-2 ring-primary/20` 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="text-xl">{icon}</span>
                          <span className="text-[10px] font-medium truncate w-full">
                            {t(`userTypes.${value.replace('_', '')}`, t(`userTypes.${value}`))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Platform Access Card */}
                  <Card className={cn(
                    "transition-all",
                    hasLogin ? "border-primary/50 bg-primary/5" : "bg-muted/30"
                  )}>
                    <CardContent className="p-4">
                      <FormField
                        control={form.control}
                        name="has_login"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0">
                            <div className="space-y-1">
                              <FormLabel className="text-base font-semibold flex items-center gap-2">
                                {hasLogin ? (
                                  <LogIn className="h-4 w-4 text-primary" />
                                ) : (
                                  <UserX className="h-4 w-4 text-muted-foreground" />
                                )}
                                {t('userManagement.platformAccess', 'Platform Access')}
                              </FormLabel>
                              <FormDescription className="text-sm">
                                {hasLogin 
                                  ? t('userManagement.loginEnabled', 'This user can log in to the platform')
                                  : t('userManagement.loginDisabled', 'Profile only - no login access')}
                              </FormDescription>
                              <Badge variant={hasLogin ? "default" : "secondary"} className="text-xs">
                                {hasLogin 
                                  ? t('userManagement.licensedUser', '🔐 Licensed User')
                                  : t('userManagement.billableProfile', '📋 Profile Only')}
                              </Badge>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-125" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Name & Contact */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.fullName')} *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  </div>

                  {/* Email with change warning */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          {t('auth.email')} {hasLogin && '*'}
                          {emailHasChanged && (
                            <Badge variant="outline" className="text-amber-600 border-amber-500">
                              <AlertTriangle className="h-3 w-3 me-1" />
                              {t('userManagement.emailChangeWarning', 'Credentials will change')}
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input type="email" {...field} className={cn(emailHasChanged && "border-amber-500")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Delivery Channel for new users */}
                  {!user && hasLogin && (
                    <FormField
                      control={form.control}
                      name="delivery_channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('invitations.deliveryChannel', 'Invitation Delivery')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'email'} dir={direction}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent dir={direction} className="bg-popover">
                              <SelectItem value="email">📧 {t('invitations.viaEmail', 'Email Only')}</SelectItem>
                              <SelectItem value="whatsapp">💬 {t('invitations.viaWhatsApp', 'WhatsApp Only')}</SelectItem>
                              <SelectItem value="both">📧💬 {t('invitations.viaBoth', 'Email & WhatsApp')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Active Status */}
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0 p-3 rounded-lg border">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">{t('userManagement.isActive')}</FormLabel>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Tab 2: Roles & Permissions */}
                <TabsContent value="roles" className="space-y-4 mt-0">
                  {isAdmin ? (
                    <>
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <div className="text-start">
                            <Label className="font-medium text-base">{t('roles.roleAssignment')}</Label>
                            <p className="text-sm text-muted-foreground">{t('roles.roleAssignmentDescription')}</p>
                          </div>
                          <RoleSelectorEnhanced
                            selectedRoleIds={selectedRoleIds}
                            onChange={setSelectedRoleIds}
                            userId={user?.id}
                          />
                        </CardContent>
                      </Card>

                      {/* Team Assignment for existing users */}
                      {user && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-start">
                                <Label className="font-medium">{t('hierarchy.teamAssignment')}</Label>
                                <p className="text-sm text-muted-foreground">{t('hierarchy.teamAssignmentDescription')}</p>
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
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>{t('roles.adminOnlyAccess', 'Role management requires admin privileges')}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab 3: Organization */}
                <TabsContent value="organization" className="space-y-4 mt-0">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      {/* Full Branch Access Toggle */}
                      <FormField
                        control={form.control}
                        name="has_full_branch_access"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                              <FormLabel className="font-medium">{t('userManagement.fullBranchAccess')}</FormLabel>
                              <FormDescription className="text-xs">
                                {t('userManagement.fullBranchAccessDescription')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  if (checked) form.setValue('assigned_branch_id', null);
                                }} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {/* Hierarchy Selects */}
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
                                value={hasFullBranchAccess ? 'all' : (field.value || 'none')}
                                disabled={hasFullBranchAccess}
                                dir={direction}
                              >
                                <FormControl>
                                  <SelectTrigger className={hasFullBranchAccess ? 'bg-muted' : ''}>
                                    <SelectValue placeholder={t('common.select')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent dir={direction} className="bg-popover">
                                  {hasFullBranchAccess ? (
                                    <SelectItem value="all">{t('userManagement.allBranches')}</SelectItem>
                                  ) : (
                                    <>
                                      <SelectItem value="none">{t('common.none')}</SelectItem>
                                      {hierarchy.branches.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                      ))}
                                    </>
                                  )}
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
                                dir={direction}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('common.select')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent dir={direction} className="bg-popover">
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
                                dir={direction}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('common.select')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent dir={direction} className="bg-popover">
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
                                dir={direction}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('common.select')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent dir={direction} className="bg-popover">
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

                      {/* Site Assignment */}
                      <FormField
                        control={form.control}
                        name="assigned_site_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('userManagement.assignedSite', 'Assigned Site')}</FormLabel>
                            <Select 
                              onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                              value={field.value || 'none'}
                              dir={direction}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('common.select')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent dir={direction} className="bg-popover">
                                <SelectItem value="none">{t('common.none')}</SelectItem>
                                {filteredSites.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              {t('userManagement.assignedSiteDescription', 'Physical work location for this user')}
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 4: Type-Specific Details */}
                <TabsContent value="details" className="space-y-4 mt-0">
                  {userType === 'employee' && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">👤</span>
                          <h3 className="font-medium">{t('userManagement.employeeDetails', 'Employee Details')}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                      </CardContent>
                    </Card>
                  )}

                  {isContractorType(userType) && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">🔧</span>
                          <h3 className="font-medium">{t('userManagement.contractorDetails', 'Contractor Details')}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
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
                          <div className="grid grid-cols-2 gap-4">
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
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {userType === 'member' && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">🏅</span>
                          <h3 className="font-medium">{t('userManagement.memberDetails', 'Member Details')}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
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
                          <div className="grid grid-cols-2 gap-4">
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
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            {/* Sticky Footer */}
            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {user ? t('common.save') : t('userManagement.sendInvitation')}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Team Assignment Dialog */}
        {showTeamAssignment && user && (
          <TeamAssignmentDialog
            open={showTeamAssignment}
            onOpenChange={setShowTeamAssignment}
            userId={user.id}
            userName={user.full_name}
            currentManagerId={currentManagerId}
            onAssigned={() => {
              // Refetch manager assignment
              supabase
                .from('manager_team')
                .select('manager_id')
                .eq('user_id', user.id)
                .maybeSingle()
                .then(({ data }) => setCurrentManagerId(data?.manager_id || null));
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

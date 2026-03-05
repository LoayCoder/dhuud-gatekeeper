import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserType, isContractorType, userTypeHasLogin, getUserTypeLabel } from '@/lib/license-utils';
import { useLicensedUserQuota } from '@/hooks/use-licensed-user-quota';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/features/users';
import { UserFormValues, userFormSchema, UserFormDialogProps } from '../types';

export function useUserFormState(props: UserFormDialogProps) {
  const { open, onOpenChange, user, onSave } = props;
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
    sites: unknown[];
  }>({
    branches: [],
    divisions: [],
    departments: [],
    sections: [],
    sites: [],
  });
  
  // Multi-branch selection state
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

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
        supabase.from('branches').select('*').eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('name'),
        supabase.from('divisions').select('*').eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('name'),
        supabase.from('departments').select('*').eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('name'),
        supabase.from('sections').select('*').eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('name'),
        supabase.from('sites').select('id, name, branch_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('name'),
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

        // Load user branch assignments
        const { data: branchAssignments } = await supabase
          .from('user_branch_assignments')
          .select('branch_id, is_primary')
          .eq('user_id', user.id)
          .is('deleted_at', null);
        
        if (branchAssignments && branchAssignments.length > 0) {
          setSelectedBranchIds(branchAssignments.map(a => a.branch_id));
        } else if (user.assigned_branch_id) {
          // Fallback to legacy single branch
          setSelectedBranchIds([user.assigned_branch_id]);
        } else {
          setSelectedBranchIds([]);
        }

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
        setSelectedBranchIds([]);
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

  // Filter divisions by selected branches with deduplication
  const filteredDivisions = useMemo(() => {
    // If no branches selected and no full access, show nothing
    const hasFullAccess = form.getValues('has_full_branch_access');
    if (selectedBranchIds.length === 0 && !hasFullAccess) return [];
    
    // Get divisions to filter - include hybrid divisions (branch_id = NULL) for all users
    let divisions = hierarchy.divisions;
    
    // If not full access, filter by selected branches OR hybrid divisions (branch_id = NULL)
    if (!hasFullAccess && selectedBranchIds.length > 0) {
      divisions = divisions.filter((d) => 
        d.branch_id === null || selectedBranchIds.includes(d.branch_id)
      );
    }
    
    // Deduplicate by name for multi-branch selection
    const seen = new Map();
    divisions.forEach((d) => {
      if (!seen.has(d.name)) {
        seen.set(d.name, d);
      }
    });
    return Array.from(seen.values());
  }, [hierarchy.divisions, selectedBranchIds, form]);

  const filteredDepartments = useMemo(() => {
    if (!selectedDivisionId) return [];
    
    const hasFullAccess = form.getValues('has_full_branch_access');
    
    // If no branches selected AND not full access, return empty
    if (selectedBranchIds.length === 0 && !hasFullAccess) return [];
    
    let depts = hierarchy.departments.filter((d) => d.division_id === selectedDivisionId);
    
    // Filter by selected branches if not full access
    if (!hasFullAccess) {
      depts = depts.filter((d) => !d.branch_id || selectedBranchIds.includes(d.branch_id));
    }
    
    // Deduplicate by name
    const seen = new Map();
    depts.forEach((d) => {
      if (!seen.has(d.name)) {
        seen.set(d.name, d);
      }
    });
    return Array.from(seen.values());
  }, [hierarchy.departments, selectedDivisionId, selectedBranchIds, form]);

  const filteredSections = useMemo(() => {
    if (!selectedDepartmentId) return [];
    
    const hasFullAccess = form.getValues('has_full_branch_access');
    
    // If no branches selected AND not full access, return empty
    if (selectedBranchIds.length === 0 && !hasFullAccess) return [];
    
    const secs = hierarchy.sections.filter((s) => s.department_id === selectedDepartmentId);
    
    // Deduplicate by name for consistency
    const seen = new Map();
    secs.forEach((s) => {
      if (!seen.has(s.name)) {
        seen.set(s.name, s);
      }
    });
    return Array.from(seen.values());
  }, [hierarchy.sections, selectedDepartmentId, selectedBranchIds, form]);

  // Filter sites by selected branches (multi-branch support)
  const filteredSites = useMemo(() => {
    if (selectedBranchIds.length === 0) return hierarchy.sites;
    return hierarchy.sites.filter((s) => selectedBranchIds.includes(s.branch_id));
  }, [hierarchy.sites, selectedBranchIds]);

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

  // Reset division/department/section when branch selection changes
  useEffect(() => {
    const hasFullAccess = form.getValues('has_full_branch_access');
    
    // If no branches selected and not full access, clear all hierarchy fields
    if (selectedBranchIds.length === 0 && !hasFullAccess) {
      form.setValue('assigned_division_id', null);
      form.setValue('assigned_department_id', null);
      form.setValue('assigned_section_id', null);
      return;
    }
    
    // If branches are selected, check if current division belongs to selected branches
    const currentDivisionId = form.getValues('assigned_division_id');
    if (currentDivisionId && !hasFullAccess) {
      const divisionBelongsToBranches = hierarchy.divisions.some(
        d => d.id === currentDivisionId && selectedBranchIds.includes(d.branch_id)
      );
      if (!divisionBelongsToBranches) {
        form.setValue('assigned_division_id', null);
        form.setValue('assigned_department_id', null);
        form.setValue('assigned_section_id', null);
      }
    }
  }, [selectedBranchIds, hierarchy.divisions, form]);

  const currentEmail = form.watch('email');
  const emailHasChanged = user && originalEmail && currentEmail !== originalEmail;

  const onSubmit = async (data: UserFormValues) => {
    if (!user && data.has_login && !checkCanAddUser()) {
      return;
    }

    setIsLoading(true);
    try {
      const emailChanged = !!(user && originalEmail && data.email !== originalEmail);
      await onSave(data, selectedRoleIds, emailChanged, originalEmail, selectedBranchIds);
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


  return {
    t, i18n, direction, profile, isAdmin, form,
    activeTab, setActiveTab, isLoading, setIsLoading,
    selectedRoleIds, setSelectedRoleIds,
    showTeamAssignment, setShowTeamAssignment,
    currentManagerId, setCurrentManagerId,
    hierarchy, selectedBranchIds, setSelectedBranchIds,
    userType, hasLogin, hasFullBranchAccess,
    selectedDivisionId, selectedDepartmentId,
    filteredDivisions, filteredDepartments, filteredSections, filteredSites,
    currentEmail, originalEmail, emailHasChanged,
    onSubmit, hasManagerRole, showTypeSpecificTab, getTabStatus,
    roles, user, onOpenChange, quota
  };
}


import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Plus, Search, Download, X, Upload, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserFormDialog, UserDetailPopover, UserImportDialog, InvitationManagementPanel } from "@/components/users";
import { EmailSyncBanner } from "@/components/users/EmailSyncBanner";
import { LicensedUserQuotaCard } from "@/components/billing/LicensedUserQuotaCard";
import { useLicensedUserQuota } from "@/hooks/use-licensed-user-quota";
import { getUserTypeLabel, getContractorType } from "@/lib/license-utils";
import { useAdminAuditLog, detectUserChanges } from "@/hooks/use-admin-audit-log";
import { ManagerTeamViewer } from "@/components/hierarchy/ManagerTeamViewer";
import { useUserRoles, RoleCategory } from "@/hooks/use-user-roles";
import { RoleBadge } from "@/components/roles/RoleBadge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useUsersPaginated, UserWithRoles, UseUsersPaginatedFilters } from "@/hooks/use-users-paginated";
import { exportToCSV, exportToExcel, ExportColumn } from "@/lib/export-utils";

interface HierarchyItem {
  id: string;
  name: string;
}

type BulkActionType = 'activate' | 'deactivate' | 'delete' | null;

export default function UserManagement() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const direction = i18n.dir();
  
  const [branches, setBranches] = useState<HierarchyItem[]>([]);
  const [divisions, setDivisions] = useState<HierarchyItem[]>([]);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);

  // Search with debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Export loading
  const [exporting, setExporting] = useState(false);
  
  // Import dialog
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Email sync state
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);

  // Filters
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { quota, breakdown, isLoading: quotaLoading, refetch: refetchQuota } = useLicensedUserQuota();
  const { logUserCreated, logUserUpdated, logUserDeactivated, logUserActivated, logUserDeleted } = useAdminAuditLog();
  const { roles, assignRoles } = useUserRoles();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Build filters object for the hook
  const filters: UseUsersPaginatedFilters = {
    userType: userTypeFilter !== 'all' ? userTypeFilter : null,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : null,
    branchId: branchFilter !== 'all' ? branchFilter : null,
    divisionId: divisionFilter !== 'all' ? divisionFilter : null,
    roleCode: roleFilter !== 'all' ? roleFilter : null,
    searchTerm: searchTerm || null,
  };

  // Use the optimized server-side paginated query
  const {
    users,
    isLoading: loading,
    page,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    refetch: refetchUsers,
    resetPage,
  } = useUsersPaginated({ filters, pageSize: 25 });

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    resetPage();
  }, [userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter, searchTerm, resetPage]);

  // Clear selection when users change
  useEffect(() => {
    setSelectedUsers(new Set());
  }, [users]);

  // Fetch branches and divisions for filters (one-time, tenant-scoped)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!profile?.tenant_id) return;
      const [b, d] = await Promise.all([
        supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant_id).order('name').limit(100),
        supabase.from('divisions').select('id, name').eq('tenant_id', profile.tenant_id).order('name').limit(100),
      ]);
      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
    };
    fetchFilterOptions();
  }, [profile?.tenant_id]);

  const handleAddUser = () => { setEditingUser(null); setIsFormDialogOpen(true); };
  const handleEditUser = (user: UserWithRoles) => { setEditingUser(user); setIsFormDialogOpen(true); };

  const handleSaveUser = async (data: any, selectedRoleIds: string[], emailChanged: boolean = false, originalEmail: string | null = null) => {
    try {
      const updateData = {
        full_name: data.full_name,
        email: data.email || null,
        phone_number: data.phone_number,
        user_type: data.user_type,
        has_login: data.has_login,
        is_active: data.is_active,
        employee_id: data.employee_id || null,
        job_title: data.job_title || null,
        contractor_company_name: data.contractor_company_name || null,
        contractor_type: getContractorType(data.user_type),
        contract_start: data.contract_start || null,
        contract_end: data.contract_end || null,
        membership_id: data.membership_id || null,
        membership_start: data.membership_start || null,
        membership_end: data.membership_end || null,
        has_full_branch_access: data.has_full_branch_access ?? false,
        assigned_branch_id: data.has_full_branch_access ? null : data.assigned_branch_id,
        assigned_division_id: data.assigned_division_id,
        assigned_department_id: data.assigned_department_id,
        assigned_section_id: data.assigned_section_id,
      };

      if (editingUser) {
        // UPDATE existing user
        const changes = detectUserChanges(editingUser as unknown as Record<string, unknown>, updateData);
        const wasActive = editingUser.is_active;
        const isNowActive = data.is_active;
        
        // If email has changed, use the secure edge function to update auth.users first
        if (emailChanged && originalEmail && data.email && data.email !== originalEmail) {
          console.log('Email change detected, calling admin-update-user edge function...');
          
          const { data: edgeFnResult, error: edgeFnError } = await supabase.functions.invoke('admin-update-user', {
            body: {
              user_id: editingUser.id,
              old_email: originalEmail,
              new_email: data.email,
              updates: updateData,
            },
          });
          
          if (edgeFnError) {
            console.error('Edge function error:', edgeFnError);
            throw new Error(edgeFnError.message || t('userManagement.emailUpdateFailed', 'Failed to update login credentials'));
          }
          
          if (edgeFnResult?.error) {
            console.error('Edge function returned error:', edgeFnResult.error);
            throw new Error(edgeFnResult.error);
          }
          
          console.log('Email update successful via edge function:', edgeFnResult);
          
          // Edge function already updated profiles, so we just need to handle roles
          if (profile?.tenant_id) {
            await assignRoles(editingUser.id, selectedRoleIds, profile.tenant_id);
          }
          
          toast({ 
            title: t('userManagement.userUpdated'),
            description: t('userManagement.emailCredentialsUpdated', 'Login credentials have been updated from {{oldEmail}} to {{newEmail}}', { oldEmail: originalEmail, newEmail: data.email }),
          });
        } else {
          // Normal update without email change
          const { error } = await supabase.from('profiles').update(updateData).eq('id', editingUser.id);
          if (error) throw error;
          
          if (profile?.tenant_id) {
            await assignRoles(editingUser.id, selectedRoleIds, profile.tenant_id);
          }
          
          toast({ title: t('userManagement.userUpdated') });
        }
        
        if (wasActive && !isNowActive) {
          await logUserDeactivated(editingUser.id, data.full_name);
        } else if (!wasActive && isNowActive) {
          await logUserActivated(editingUser.id, data.full_name);
        }
        
        if (Object.keys(changes).length > 0) {
          await logUserUpdated(editingUser.id, data.full_name, changes);
        }
      } else {
        // CREATE new user - different flows based on has_login
        if (data.has_login && data.email) {
          // INVITATION-ONLY FLOW: Create invitation with metadata, profile created on signup
          const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          // Get tenant name
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', profile?.tenant_id)
            .single();
          
          // Store user data in invitation metadata for profile creation on signup
          const metadata = {
            ...updateData,
            role_ids: selectedRoleIds,
          };
          
          // Determine delivery channel
          const deliveryChannel = data.delivery_channel || 'email';
          
          const { data: invitationData, error: inviteError } = await supabase.from('invitations').insert({
            tenant_id: profile?.tenant_id,
            email: data.email,
            code: inviteCode,
            expires_at: expiresAt.toISOString(),
            metadata: metadata,
            full_name: data.full_name,
            phone_number: data.phone_number || null,
            delivery_channel: deliveryChannel,
            delivery_status: 'pending',
          }).select().single();
          
          if (inviteError) throw inviteError;
          
          let emailSent = false;
          let whatsappSent = false;
          
          // Send via email if channel is email or both
          if (deliveryChannel === 'email' || deliveryChannel === 'both') {
            const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
              body: {
                email: data.email,
                code: inviteCode,
                tenantName: tenant?.name || 'DHUUD Platform',
                expiresAt: expiresAt.toISOString(),
                inviteUrl: window.location.origin,
              },
            });
            
            if (emailError) {
              console.error('Failed to send invitation email:', emailError);
            } else {
              emailSent = true;
              await supabase.from('invitations')
                .update({ email_sent_at: new Date().toISOString(), delivery_status: 'sent' })
                .eq('id', invitationData.id);
            }
          }
          
          // Send via WhatsApp if channel is whatsapp or both, and phone exists
          if ((deliveryChannel === 'whatsapp' || deliveryChannel === 'both') && data.phone_number) {
            const { data: waResult, error: waError } = await supabase.functions.invoke('send-invitation-whatsapp', {
              body: {
                invitation_id: invitationData.id,
                phone_number: data.phone_number,
                code: inviteCode,
                tenant_name: tenant?.name || 'DHUUD Platform',
                expires_at: expiresAt.toISOString(),
                full_name: data.full_name,
                invite_url: window.location.origin,
              },
            });
            
            if (waError || !waResult?.success) {
              console.error('Failed to send WhatsApp invitation:', waError || waResult?.error);
            } else {
              whatsappSent = true;
            }
          }
          
          // Show appropriate toast
          if (emailSent && whatsappSent) {
            toast({ title: t('userManagement.invitationSentBoth', 'Invitation sent via email and WhatsApp') });
          } else if (emailSent) {
            toast({ title: t('userManagement.invitationSent', { email: data.email }) });
          } else if (whatsappSent) {
            toast({ title: t('userManagement.invitationSentWhatsApp', 'Invitation sent via WhatsApp') });
          } else {
            toast({ 
              title: t('userManagement.invitationCreated'),
              description: t('userManagement.deliveryFailed', 'Invitation created but delivery failed. You can resend from the pending invitations list.'),
            });
          }
          
          await logUserCreated(inviteCode, data.full_name, data.user_type);
        } else {
          // PROFILE-ONLY FLOW: Create tenant_profile for non-login users
          const { error } = await supabase.from('tenant_profiles').insert({
            tenant_id: profile?.tenant_id,
            full_name: data.full_name,
            phone_number: data.phone_number,
            profile_type: data.user_type === 'member' ? 'member' : 
                          data.user_type === 'visitor' ? 'visitor' : 'contractor',
            is_active: data.is_active,
            has_login: false,
            employee_id: data.employee_id || null,
            job_title: data.job_title || null,
            contractor_company: data.contractor_company_name || null,
            contract_start_date: data.contract_start || null,
            contract_end_date: data.contract_end || null,
          });
          
          if (error) throw error;
          
          await logUserCreated(crypto.randomUUID(), data.full_name, data.user_type);
          toast({ title: t('userManagement.userCreated') });
        }
      }
      
      refetchUsers();
      refetchQuota();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({ 
        title: t('common.error'), 
        description: error.message || t('userManagement.saveFailed'),
        variant: 'destructive' 
      });
      throw error; // Re-throw so dialog knows save failed
    }
  };

  const getUserTypeBadgeVariant = (userType: string | null) => {
    switch (userType) {
      case 'employee': return 'default';
      case 'contractor_longterm': case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  const handleToggleUserStatus = async (user: UserWithRoles) => {
    const newStatus = !user.is_active;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', user.id);
    
    if (!error) {
      if (newStatus) {
        await logUserActivated(user.id, user.full_name || '');
        toast({ title: t('userManagement.userActivated') });
      } else {
        await logUserDeactivated(user.id, user.full_name || '');
        toast({ title: t('userManagement.userDeactivated') });
      }
      refetchUsers();
      refetchQuota();
    } else {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      // MULTI-TENANT: The admin-disable-user edge function now handles everything
      // - Soft-deletes profile for THIS tenant only
      // - Invalidates sessions for this tenant
      // - Clears MFA status for this tenant
      // - Only bans auth account if user has NO other active profiles
      
      const { data, error: disableError } = await supabase.functions.invoke('admin-disable-user', {
        body: { 
          user_id: userId,
          tenant_id: profile?.tenant_id, // Explicitly specify which tenant
          reason: 'admin_deleted'
        }
      });

      if (disableError) {
        console.error('Failed to disable user:', disableError);
        throw new Error(disableError.message || 'Failed to delete user');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete user');
      }

      // Log and notify based on what happened
      await logUserDeleted(userId, userName);
      
      if (data.account_banned) {
        toast({ 
          title: t('userManagement.userDeleted'),
          description: t('userManagement.accountFullyDisabled', 'Account fully disabled (no other tenant access)')
        });
      } else {
        toast({ 
          title: t('userManagement.userDeleted'),
          description: t('userManagement.removedFromTenant', 'User removed from this organization')
        });
      }
      
      refetchUsers();
      refetchQuota();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({ 
        title: t('common.error'), 
        description: err.message,
        variant: 'destructive' 
      });
    }
  };

  // Sync user login email with profile email
  const handleSyncUserEmail = async (userId: string, userName: string) => {
    setSyncingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-user-email', {
        body: { user_id: userId }
      });

      if (error) {
        console.error('Sync error:', error);
        throw new Error(error.message || t('userManagement.syncFailed', 'Failed to sync email'));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: t('userManagement.emailSynced', 'Email Synced'),
        description: t('userManagement.emailSyncedDesc', 'Login credentials updated from {{oldEmail}} to {{newEmail}}', {
          oldEmail: data.old_email,
          newEmail: data.new_email
        }),
      });

      refetchUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('userManagement.syncFailed', 'Failed to sync email');
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSyncingUserId(null);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSet = new Set(selectedUsers);
    if (checked) {
      newSet.add(userId);
    } else {
      newSet.delete(userId);
    }
    setSelectedUsers(newSet);
  };

  const handleBulkActionClick = (action: BulkActionType) => {
    setBulkActionType(action);
    setBulkActionDialogOpen(true);
  };

  const handleBulkAction = async () => {
    if (!bulkActionType || selectedUsers.size === 0) return;
    
    setBulkActionLoading(true);
    const userIds = Array.from(selectedUsers);
    
    try {
      if (bulkActionType === 'delete') {
        const { error } = await supabase
          .from('profiles')
          .update({ deleted_at: new Date().toISOString(), is_deleted: true })
          .in('id', userIds);
        
        if (error) throw error;
        
        // Log each deletion
        for (const userId of userIds) {
          const user = users.find(u => u.id === userId);
          if (user) await logUserDeleted(userId, user.full_name || '');
        }
        
        toast({ title: t('userManagement.bulkDeleteSuccess', { count: userIds.length }) });
      } else {
        const newStatus = bulkActionType === 'activate';
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: newStatus })
          .in('id', userIds);
        
        if (error) throw error;
        
        // Log each status change
        for (const userId of userIds) {
          const user = users.find(u => u.id === userId);
          if (user) {
            if (newStatus) {
              await logUserActivated(userId, user.full_name || '');
            } else {
              await logUserDeactivated(userId, user.full_name || '');
            }
          }
        }
        
        toast({ 
          title: newStatus 
            ? t('userManagement.bulkActivateSuccess', { count: userIds.length })
            : t('userManagement.bulkDeactivateSuccess', { count: userIds.length })
        });
      }
      
      setSelectedUsers(new Set());
      refetchUsers();
      refetchQuota();
    } catch (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
      setBulkActionDialogOpen(false);
      setBulkActionType(null);
    }
  };

  // Export handlers
  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    
    try {
      // Fetch all filtered users for export (high limit)
      const { data, error } = await supabase.rpc('get_users_with_roles_paginated', {
        p_tenant_id: profile?.tenant_id,
        p_user_type: filters.userType || null,
        p_is_active: filters.isActive ?? null,
        p_branch_id: filters.branchId || null,
        p_division_id: filters.divisionId || null,
        p_role_code: filters.roleCode || null,
        p_search_term: filters.searchTerm || null,
        p_offset: 0,
        p_limit: 10000,
      });
      
      if (error) throw error;
      
      const columns: ExportColumn[] = [
        { key: 'full_name', label: t('profile.fullName') },
        { key: 'employee_id', label: t('userManagement.employeeId') },
        { key: 'phone_number', label: t('profile.phone') },
        { key: 'user_type', label: t('userManagement.userType'), formatter: (v) => v ? t(getUserTypeLabel(v as string)) : '' },
        { key: 'is_active', label: t('userManagement.status'), formatter: (v) => v ? t('userManagement.active') : t('userManagement.inactive') },
        { key: 'branch_name', label: t('orgStructure.branch') },
        { key: 'division_name', label: t('orgStructure.division') },
        { key: 'department_name', label: t('orgStructure.department') },
        { key: 'section_name', label: t('orgStructure.section') },
        { key: 'job_title', label: t('userManagement.jobTitle') },
        { key: 'role_assignments', label: t('userManagement.roles'), formatter: (v) => {
          if (!v || !Array.isArray(v)) return '';
          return (v as Array<{role_name: string}>).map(r => r.role_name).join(', ');
        }},
      ];
      
      const filename = `users-export-${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'csv') {
        exportToCSV(data || [], `${filename}.csv`, columns);
      } else {
        exportToExcel(data || [], `${filename}.xlsx`, columns);
      }
      
      toast({ title: t('userManagement.exportSuccess') });
    } catch (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const hierarchyArrow = direction === 'rtl' ? '←' : '↳';
  const allSelected = users.length > 0 && users.every(u => selectedUsers.has(u.id));
  const someSelected = users.some(u => selectedUsers.has(u.id)) && !allSelected;

  return (
    <div className="container py-8 space-y-6" dir={direction}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1 text-start">
          <h1 className="text-3xl font-bold tracking-tight">{t('userManagement.title')}</h1>
          <p className="text-muted-foreground">{t('userManagement.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t('userManagement.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                {t('userManagement.exportCSV')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                {t('userManagement.exportExcel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            {t('userManagement.importUsers')}
          </Button>
          <Button onClick={handleAddUser} className="gap-2">
            <Plus className="h-4 w-4 rtl:order-last" />
            {t('userManagement.addUser')}
          </Button>
        </div>
      </div>

      <LicensedUserQuotaCard quota={quota} breakdown={breakdown} isLoading={quotaLoading} showUpgradeCta={true} />

      <EmailSyncBanner onSyncComplete={refetchUsers} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-start">{t('userManagement.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('userManagement.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="ps-10"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchInput('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByType')}</label>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allTypes')}</SelectItem>
                  <SelectItem value="employee">{t('userTypes.employee')}</SelectItem>
                  <SelectItem value="contractor_longterm">{t('userTypes.contractorLongterm')}</SelectItem>
                  <SelectItem value="contractor_shortterm">{t('userTypes.contractorShortterm')}</SelectItem>
                  <SelectItem value="member">{t('userTypes.member')}</SelectItem>
                  <SelectItem value="visitor">{t('userTypes.visitor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByStatus')}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('userManagement.active')}</SelectItem>
                  <SelectItem value="inactive">{t('userManagement.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByBranch')}</label>
              <Select value={branchFilter} onValueChange={setBranchFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allBranches')}</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByDivision')}</label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allDivisions')}</SelectItem>
                  {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-start">
              <label className="text-sm font-medium">{t('userManagement.filterByRole')}</label>
              <Select value={roleFilter} onValueChange={setRoleFilter} dir={direction}>
                <SelectTrigger className="text-start"><SelectValue /></SelectTrigger>
                <SelectContent dir={direction} className="bg-background">
                  <SelectItem value="all">{t('userManagement.allRoles')}</SelectItem>
                  {roles.map(r => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations Panel */}
      <InvitationManagementPanel />

      {/* Bulk Actions Toolbar */}
      {selectedUsers.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {t('userManagement.selectedCount', { count: selectedUsers.size })}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUsers(new Set())}>
                  {t('userManagement.clearSelection')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkActionClick('activate')}
                >
                  {t('userManagement.bulkActivate')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkActionClick('deactivate')}
                >
                  {t('userManagement.bulkDeactivate')}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleBulkActionClick('delete')}
                >
                  {t('userManagement.bulkDelete')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label={t('userManagement.selectAll')}
                      className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                      {...(someSelected ? { 'data-state': 'indeterminate' } : {})}
                    />
                  </TableHead>
                  <TableHead className="text-start">{t('profile.fullName')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.userType')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.status')}</TableHead>
                  <TableHead className="text-start">{t('orgStructure.branch')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.roles')}</TableHead>
                  <TableHead className="text-start">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className={selectedUsers.has(user.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                          aria-label={t('userManagement.selectUser', { name: user.full_name })}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-start">
                        <UserDetailPopover
                          user={user}
                          onEdit={() => handleEditUser(user)}
                          onToggleStatus={() => handleToggleUserStatus(user)}
                          onDelete={() => handleDeleteUser(user.id, user.full_name || '')}
                        />
                      </TableCell>
                      <TableCell className="text-start">
                        <Badge variant={getUserTypeBadgeVariant(user.user_type)}>
                          {user.user_type ? t(getUserTypeLabel(user.user_type)) : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start">
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? t('userManagement.active') : t('userManagement.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start">
                        {user.branch_name || '-'}
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex flex-wrap gap-1">
                          {user.role_assignments && user.role_assignments.length > 0 ? (
                            <>
                              {user.role_assignments
                                .filter(r => r.role_code !== 'normal_user')
                                .slice(0, 3)
                                .map((role) => (
                                  <RoleBadge
                                    key={role.role_id}
                                    code={role.role_code}
                                    name={role.role_name}
                                    category={role.category as RoleCategory}
                                    size="sm"
                                  />
                                ))}
                              {user.role_assignments.filter(r => r.role_code !== 'normal_user').length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.role_assignments.filter(r => r.role_code !== 'normal_user').length - 3}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-start">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            aria-label={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {user.has_login && user.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSyncUserEmail(user.id, user.full_name || '')}
                              disabled={syncingUserId === user.id}
                              aria-label={t('userManagement.syncEmail', 'Sync Login Email')}
                              title={t('userManagement.syncEmailTooltip', 'Sync login email with profile email')}
                            >
                              {syncingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <ManagerTeamViewer 
                            managerId={user.id} 
                            managerName={user.full_name || undefined} 
                            compact 
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          
          {totalPages > 1 && (
            <div className="border-t p-4">
              <PaginationControls
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={25}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onNextPage={goToNextPage}
                onPreviousPage={goToPreviousPage}
                onFirstPage={() => goToPage(1)}
                onLastPage={() => goToPage(totalPages)}
                isLoading={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        user={editingUser ? {
          id: editingUser.id,
          full_name: editingUser.full_name,
          email: editingUser.email,
          phone_number: editingUser.phone_number,
          user_type: editingUser.user_type,
          has_login: editingUser.has_login,
          is_active: editingUser.is_active,
          employee_id: editingUser.employee_id,
          job_title: editingUser.job_title,
          has_full_branch_access: editingUser.has_full_branch_access,
          assigned_branch_id: editingUser.assigned_branch_id,
          assigned_division_id: editingUser.assigned_division_id,
          assigned_department_id: editingUser.assigned_department_id,
          assigned_section_id: editingUser.assigned_section_id,
          contractor_company_name: editingUser.contractor_company_name,
          contract_start: editingUser.contract_start,
          contract_end: editingUser.contract_end,
          membership_id: editingUser.membership_id,
          membership_start: editingUser.membership_start,
          membership_end: editingUser.membership_end,
        } : null}
        onSave={handleSaveUser}
      />

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">
              {bulkActionType === 'delete' && t('userManagement.confirmBulkDelete', { count: selectedUsers.size })}
              {bulkActionType === 'activate' && t('userManagement.confirmBulkActivate', { count: selectedUsers.size })}
              {bulkActionType === 'deactivate' && t('userManagement.confirmBulkDeactivate', { count: selectedUsers.size })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {bulkActionType === 'delete' && t('userManagement.bulkDeleteDesc')}
              {bulkActionType === 'activate' && t('userManagement.bulkActivateDesc')}
              {bulkActionType === 'deactivate' && t('userManagement.bulkDeactivateDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkAction}
              disabled={bulkActionLoading}
              className={bulkActionType === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <UserImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={() => {
          refetchUsers();
          refetchQuota();
        }}
      />
    </div>
  );
}

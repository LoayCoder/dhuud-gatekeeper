
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";
import { performSecureExport, type ReportColumn } from "@/lib/secure-export";
import { getUserTypeLabel } from "@/lib/license-utils";

type BulkActionType = 'activate' | 'deactivate' | 'delete' | null;

export function useUserManagementExtraActions(state: ReturnType<typeof import('./useUserManagement').useUserManagementState>, dataProps: ReturnType<typeof import('./useUserManagement').useUserManagementData>) {
  const {
    t, profile, user,
    setSyncingUserId, setResetPasswordTarget, setResetPasswordDialogOpen,
    setResetPasswordUserId, resetPasswordTarget,
    selectedUsers, setSelectedUsers,
    setBulkActionType, setBulkActionDialogOpen, bulkActionType,
    setBulkActionLoading, setExporting,
    setUserTypeFilter, setStatusFilter, setBranchFilter, setDivisionFilter,
    setRoleFilter, setSearchInput,
    logUserDeactivated, logUserActivated, logUserDeleted, refetchQuota,
    userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter, searchInput
  } = state;
  const { users, refetchUsers } = dataProps;

  const handleSyncUserEmail = async (userId: string, _userName: string) => {
    setSyncingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-user-email', {
        body: { user_id: userId }
      });
      if (error) throw new Error(error.message || t('userManagement.syncFailed', 'Failed to sync email'));
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('userManagement.emailSynced', 'Email Synced'),
        description: t('userManagement.emailSyncedDesc', 'Login credentials updated from {{oldEmail}} to {{newEmail}}', {
          oldEmail: data.old_email, newEmail: data.new_email
        }),
      });
      refetchUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('userManagement.syncFailed', 'Failed to sync email');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setSyncingUserId(null);
    }
  };

  const handleResetPasswordClick = (userId: string, userName: string, phoneNumber: string | null) => {
    if (!phoneNumber) {
      toast({ title: t('common.error'), description: t('userManagement.noPhoneNumber', 'User has no phone number configured'), variant: 'destructive' });
      return;
    }
    setResetPasswordTarget({ id: userId, name: userName, phone: phoneNumber });
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget) return;
    setResetPasswordUserId(resetPasswordTarget.id);
    setResetPasswordDialogOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: resetPasswordTarget.id }
      });
      if (error) throw new Error(error.message || t('userManagement.resetPasswordFailed', 'Failed to reset password'));
      if (data?.error) throw new Error(data.error);

      if (data?.whatsapp_sent) {
        toast({ title: t('userManagement.passwordResetSuccess', 'Password Reset'), description: t('userManagement.passwordSentViaWhatsApp', 'Temporary password sent via WhatsApp to {{phone}}', { phone: resetPasswordTarget.phone.slice(-4).padStart(resetPasswordTarget.phone.length, '*') }) });
      } else {
        toast({ title: t('userManagement.passwordResetSuccess', 'Password Reset'), description: t('userManagement.passwordResetNoWhatsApp', 'Password was reset but WhatsApp notification failed'), variant: 'destructive' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('userManagement.resetPasswordFailed', 'Failed to reset password');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setResetPasswordUserId(null);
      setResetPasswordTarget(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map((u: any) => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSet = new Set(selectedUsers);
    if (checked) { newSet.add(userId); } else { newSet.delete(userId); }
    setSelectedUsers(newSet);
  };

  const handleBulkActionClick = (action: BulkActionType) => {
    setBulkActionType(action);
    setBulkActionDialogOpen(true);
  };

  const handleBulkAction = async () => {
    if (!bulkActionType || selectedUsers.size === 0) return;
    setBulkActionLoading(true);
    const userIds = Array.from(selectedUsers) as string[];
    try {
      if (bulkActionType === 'delete') {
        let successCount = 0;
        const errors: string[] = [];
        for (const userId of userIds) {
          const targetUser = users.find((u: any) => u.id === userId);
          const { data, error } = await supabase.functions.invoke('admin-disable-user', {
            body: { user_id: userId, tenant_id: profile?.tenant_id, reason: 'bulk_admin_deleted' }
          });
          if (error || !data?.success) {
            errors.push(targetUser?.full_name || userId);
            logger.error('Failed to delete user:', userId, error || data?.error);
          } else {
            successCount++;
            if (targetUser) await logUserDeleted(userId, targetUser.full_name || '');
          }
        }
        if (errors.length > 0) {
          toast({ title: t('userManagement.bulkDeletePartial', { success: successCount, failed: errors.length }), description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : ''), variant: 'destructive' });
        } else {
          toast({ title: t('userManagement.bulkDeleteSuccess', { count: successCount }) });
        }
      } else {
        const newStatus = bulkActionType === 'activate';
        const { error } = await supabase.from('profiles').update({ is_active: newStatus }).in('id', userIds);
        if (error) throw error;
        for (const userId of userIds) {
          const u = users.find((usr: any) => usr.id === userId);
          if (u) {
            if (newStatus) await logUserActivated(userId, u.full_name || '');
            else await logUserDeactivated(userId, u.full_name || '');
          }
        }
        toast({ title: newStatus ? t('userManagement.bulkActivateSuccess', { count: userIds.length }) : t('userManagement.bulkDeactivateSuccess', { count: userIds.length }) });
      }
      setSelectedUsers(new Set());
      refetchUsers();
      refetchQuota();
    } catch (_error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
      setBulkActionDialogOpen(false);
      setBulkActionType(null);
    }
  };

  const handleExport = async (_format: 'csv' | 'xlsx') => {
    if (!user?.id) { toast({ title: t('common.error'), variant: 'destructive' }); return; }
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc('get_users_with_roles_paginated', {
        p_tenant_id: profile?.tenant_id, p_user_type: userTypeFilter === 'all' ? null : userTypeFilter, p_is_active: statusFilter === 'all' ? null : statusFilter === 'active',
        p_branch_id: branchFilter === 'all' ? null : branchFilter, p_division_id: divisionFilter === 'all' ? null : divisionFilter, p_role_code: roleFilter === 'all' ? null : roleFilter,
        p_search_term: searchInput || null, p_offset: 0, p_limit: 10000,
      });
      if (error) throw error;

      const exportData = (data || []).map((u: any) => ({
        full_name: u.full_name || '', employee_id: u.employee_id || '', phone_number: u.phone_number || '',
        user_type: u.user_type ? t(getUserTypeLabel(u.user_type)) : '',
        is_active: u.is_active ? t('userManagement.active') : t('userManagement.inactive'),
        branch_name: u.branch_name || '', division_name: u.division_name || '', department_name: u.department_name || '',
        section_name: u.section_name || '', job_title: u.job_title || '',
        roles: Array.isArray(u.role_assignments) ? (u.role_assignments as Array<{ role_name: string }>).map((r: any) => r.role_name).join(', ') : '',
      }));

      const columns: ReportColumn[] = [
        { id: 'full_name', label: t('profile.fullName') }, { id: 'employee_id', label: t('userManagement.employeeId') },
        { id: 'phone_number', label: t('profile.phone') }, { id: 'user_type', label: t('userManagement.userType') },
        { id: 'is_active', label: t('userManagement.status') }, { id: 'branch_name', label: t('orgStructure.branch') },
        { id: 'division_name', label: t('orgStructure.division') }, { id: 'department_name', label: t('orgStructure.department') },
        { id: 'section_name', label: t('orgStructure.section') }, { id: 'job_title', label: t('userManagement.jobTitle') },
        { id: 'roles', label: t('userManagement.roles') },
      ];

      const result = await performSecureExport(user.id, 'user_management', 'user', exportData, columns, `users-export-${new Date().toISOString().split('T')[0]}`, 'excel', { userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter, searchInput });
      if (result.success) toast({ title: t('userManagement.exportSuccess') });
      else toast({ title: result.error || t('common.error'), variant: 'destructive' });
    } catch (_error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const clearAllFilters = () => {
    setUserTypeFilter('all');
    setStatusFilter('all');
    setBranchFilter('all');
    setDivisionFilter('all');
    setRoleFilter('all');
    setSearchInput('');
  };

  const getUserInitials = (name: string | null) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return {
    handleSyncUserEmail, handleResetPasswordClick, handleResetPassword,
    handleSelectAll, handleSelectUser, handleBulkActionClick,
    handleBulkAction, handleExport, clearAllFilters, getUserInitials
  };
}

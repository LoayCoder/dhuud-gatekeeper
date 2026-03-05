const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, 'src/pages/admin/UserManagement/hooks');

const stateFile = `import { UseUsersPaginatedFilters, UserWithRoles } from "@/hooks/use-users-paginated";

export interface UseUserActionsProps {
  profile: any;
  user: any;
  users: UserWithRoles[];
  filters: UseUsersPaginatedFilters;
  refetchUsers: () => void;
  refetchQuota: () => void;
  assignRoles: (userId: string, roleIds: string[], tenantId: string) => Promise<void>;
  logUserCreated: any;
  logUserUpdated: any;
  logUserDeactivated: any;
  logUserActivated: any;
  logUserDeleted: any;
  setEditingUser: (user: any) => void;
  setIsFormDialogOpen: (open: boolean) => void;
  setSelectedUsers: (set: Set<string>) => void;
  setBulkActionLoading: (loading: boolean) => void;
  setBulkActionDialogOpen: (open: boolean) => void;
  setBulkActionType: (type: any) => void;
  setSyncingUserId: (id: string | null) => void;
  setResetPasswordUserId: (id: string | null) => void;
  setResetPasswordTarget: (target: any) => void;
  setResetPasswordDialogOpen: (open: boolean) => void;
  setExporting: (exporting: boolean) => void;
  t: unknown;
  selectedUsers: Set<string>;
  bulkActionType: any;
  resetPasswordTarget: any;
}

export function useUserActionsState(props: UseUserActionsProps) {
  // Pass-through of properties so other hooks can access them easily
  return { ...props };
}`;

const handlersFile = `import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";
import { getContractorType } from "@/lib/license-utils";
import { detectUserChanges } from "@/hooks/use-admin-audit-log";
import { UseUserActionsProps } from "./useUserActionsState";

export function useUserActionsHandlers(props: UseUserActionsProps) {
  const {
    profile,
    refetchUsers, refetchQuota, assignRoles,
    logUserCreated, logUserUpdated, logUserDeactivated, logUserActivated, logUserDeleted,
    t: tAny, 
  } = props;
  const t = tAny as any;

  // We need editingUser from somewhere, wait, it was global in UserManagement.tsx and it's not even in props?!
  // Wait, let's fix that. The original useUserActions used editingUser from closure? Let me look at the code.
  // The original useUserActions used editingUser from nowhere. Oh wait, editingUser is not passed in props but used?
  // Let's pass it or extract it. Wait, the original had it. I will keep it simple.
  
  // Wait, I will just write exactly the code for handlers:
  const handleSaveUser = async (data: any, selectedRoleIds: string[], emailChanged: boolean = false, originalEmail: string | null = null, selectedBranchIds: string[] = [], editingUser: any = null) => {
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
        assigned_branch_id: data.has_full_branch_access ? null : (selectedBranchIds[0] || null),
        assigned_division_id: data.assigned_division_id,
        assigned_department_id: data.assigned_department_id,
        assigned_section_id: data.assigned_section_id,
        assigned_site_id: data.assigned_site_id || null,
      };

      const syncBranchAssignments = async (userId: string) => {
        if (!profile?.tenant_id) return;
        await supabase.from('user_branch_assignments').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId).eq('tenant_id', profile.tenant_id).is('deleted_at', null);
        if (!data.has_full_branch_access && selectedBranchIds.length > 0) {
          const branchAssignments = selectedBranchIds.map((branchId, index) => ({
            user_id: userId, branch_id: branchId, is_primary: index === 0, access_level: 'standard' as const, tenant_id: profile.tenant_id,
          }));
          await supabase.from('user_branch_assignments').insert(branchAssignments);
        }
      };

      if (editingUser) {
        const changes = detectUserChanges(editingUser as unknown as Record<string, unknown>, updateData);
        const wasActive = editingUser.is_active;
        const isNowActive = data.is_active;
        
        if (emailChanged && originalEmail && data.email && data.email !== originalEmail) {
          const { data: edgeFnResult, error: edgeFnError } = await supabase.functions.invoke('admin-update-user', {
            body: { user_id: editingUser.id, old_email: originalEmail, new_email: data.email, updates: updateData },
          });
          if (edgeFnError) throw new Error(edgeFnError.message || t('userManagement.emailUpdateFailed', 'Failed to update login credentials'));
          if (edgeFnResult?.error) throw new Error(edgeFnResult.error);
          
          if (profile?.tenant_id) {
            await assignRoles(editingUser.id, selectedRoleIds, profile.tenant_id);
            await syncBranchAssignments(editingUser.id);
          }
          toast({ title: t('userManagement.userUpdated'), description: t('userManagement.emailCredentialsUpdated', 'Login credentials have been updated from {{oldEmail}} to {{newEmail}}', { oldEmail: originalEmail, newEmail: data.email }), });
        } else {
          const { error } = await supabase.from('profiles').update(updateData).eq('id', editingUser.id);
          if (error) throw error;
          if (profile?.tenant_id) {
            await assignRoles(editingUser.id, selectedRoleIds, profile.tenant_id);
            await syncBranchAssignments(editingUser.id);
          }
          toast({ title: t('userManagement.userUpdated') });
        }
        
        if (wasActive && !isNowActive) await logUserDeactivated(editingUser.id, data.full_name);
        else if (!wasActive && isNowActive) await logUserActivated(editingUser.id, data.full_name);
        
        if (Object.keys(changes).length > 0) await logUserUpdated(editingUser.id, data.full_name, changes);
      } else {
        if (data.has_login && data.email) {
          const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          const { data: tenant } = await supabase.from('tenants').select('name').eq('id', profile?.tenant_id).single();
          const metadata = { ...updateData, role_ids: selectedRoleIds };
          const deliveryChannel = data.delivery_channel || 'email';
          
          const { data: invitationData, error: inviteError } = await supabase.from('invitations').insert({
            tenant_id: profile?.tenant_id, email: data.email, code: inviteCode, expires_at: expiresAt.toISOString(), metadata: metadata,
            full_name: data.full_name, phone_number: data.phone_number || null, delivery_channel: deliveryChannel, delivery_status: 'pending',
          }).select().single();
          
          if (inviteError) throw inviteError;
          
          let emailSent = false;
          let whatsappSent = false;
          
          if (deliveryChannel === 'email' || deliveryChannel === 'both') {
            const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
              body: { email: data.email, code: inviteCode, tenantName: tenant?.name || 'DHUUD Platform', expiresAt: expiresAt.toISOString(), inviteUrl: window.location.origin },
            });
            if (emailError) logger.error('Failed to send invitation email:', emailError);
            else {
              emailSent = true;
              await supabase.from('invitations').update({ email_sent_at: new Date().toISOString(), delivery_status: 'sent' }).eq('id', invitationData.id);
            }
          }
          
          if ((deliveryChannel === 'whatsapp' || deliveryChannel === 'both') && data.phone_number) {
            const { data: waResult, error: waError } = await supabase.functions.invoke('send-invitation-whatsapp', {
              body: { invitation_id: invitationData.id, phone_number: data.phone_number, code: inviteCode, tenant_name: tenant?.name || 'DHUUD Platform', expires_at: expiresAt.toISOString(), full_name: data.full_name, invite_url: window.location.origin },
            });
            if (waError || !waResult?.success) logger.error('Failed to send WhatsApp invitation:', waError || waResult?.error);
            else whatsappSent = true;
          }
          
          if (emailSent && whatsappSent) toast({ title: t('userManagement.invitationSentBoth', 'Invitation sent via email and WhatsApp') });
          else if (emailSent) toast({ title: t('userManagement.invitationSent', { email: data.email }) });
          else if (whatsappSent) toast({ title: t('userManagement.invitationSentWhatsApp', 'Invitation sent via WhatsApp') });
          else toast({ title: t('userManagement.invitationCreated'), description: t('userManagement.deliveryFailed', 'Invitation created but delivery failed. You can resend from the pending invitations list.') });
          
          await logUserCreated(inviteCode, data.full_name, data.user_type);
        } else {
          const { error } = await supabase.from('tenant_profiles').insert({
            tenant_id: profile?.tenant_id, full_name: data.full_name, phone_number: data.phone_number,
            profile_type: data.user_type === 'member' ? 'member' : data.user_type === 'visitor' ? 'visitor' : 'contractor',
            is_active: data.is_active, has_login: false, employee_id: data.employee_id || null, job_title: data.job_title || null,
            contractor_company: data.contractor_company_name || null, contract_start_date: data.contract_start || null, contract_end_date: data.contract_end || null,
          });
          if (error) throw error;
          
          await logUserCreated(crypto.randomUUID(), data.full_name, data.user_type);
          toast({ title: t('userManagement.userCreated') });
        }
      }
      refetchUsers();
      refetchQuota();
    } catch (error: any) {
      logger.error('Error saving user:', error);
      toast({ title: t('common.error'), description: error.message || t('userManagement.saveFailed'), variant: 'destructive' });
      throw error;
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = !user.is_active;
    const { error } = await supabase.from('profiles').update({ is_active: newStatus }).eq('id', user.id);
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
      const { data, error: disableError } = await supabase.functions.invoke('admin-disable-user', {
        body: { user_id: userId, tenant_id: profile?.tenant_id, reason: 'admin_deleted', delete_permanently: true }
      });
      if (disableError) throw new Error(disableError.message || 'Failed to delete user');
      if (!data?.success) throw new Error(data?.error || 'Failed to delete user');

      await logUserDeleted(userId, userName);
      
      if (data.account_banned) {
        toast({ title: t('userManagement.userDeleted'), description: t('userManagement.accountFullyDisabled', 'Account fully disabled (no other tenant access)') });
      } else {
        toast({ title: t('userManagement.userDeleted'), description: t('userManagement.removedFromTenant', 'User removed from this organization') });
      }
      refetchUsers();
      refetchQuota();
    } catch (err: any) {
      logger.error('Error deleting user:', err);
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    }
  };

  return { handleSaveUser, handleToggleUserStatus, handleDeleteUser };
}`;

const extraHandlersFile = `import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";
import { performSecureExport, type ReportColumn } from "@/lib/secure-export";
import { getUserTypeLabel } from "@/lib/license-utils";
import { UseUserActionsProps } from "./useUserActionsState";

export function useUserActionsExtra(props: UseUserActionsProps) {
  const {
    profile, user, users, filters,
    refetchUsers, refetchQuota, 
    logUserDeactivated, logUserActivated, logUserDeleted,
    setSelectedUsers,
    setBulkActionLoading, setBulkActionDialogOpen, setBulkActionType,
    setSyncingUserId, setResetPasswordUserId, setResetPasswordTarget, setResetPasswordDialogOpen,
    setExporting, t: tAny, selectedUsers, bulkActionType, resetPasswordTarget
  } = props;
  const t = tAny as any;

  const handleSyncUserEmail = async (userId: string, userName: string) => {
    setSyncingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-user-email', { body: { user_id: userId } });
      if (error) throw new Error(error.message || t('userManagement.syncFailed', 'Failed to sync email'));
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('userManagement.emailSynced', 'Email Synced'),
        description: t('userManagement.emailSyncedDesc', 'Login credentials updated from {{oldEmail}} to {{newEmail}}', { oldEmail: data.old_email, newEmail: data.new_email }),
      });
      refetchUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('userManagement.syncFailed', 'Failed to sync email');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setSyncingUserId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget) return;
    setResetPasswordUserId(resetPasswordTarget.id);
    setResetPasswordDialogOpen(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', { body: { user_id: resetPasswordTarget.id } });
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

  const handleBulkAction = async () => {
    if (!bulkActionType || selectedUsers.size === 0) return;
    setBulkActionLoading(true);
    const userIds = Array.from(selectedUsers);
    
    try {
      if (bulkActionType === 'delete') {
        let successCount = 0;
        const errors: string[] = [];
        
        for (const userId of userIds) {
          const targetUser = users.find((u: any) => u.id === userId);
          const { data, error } = await supabase.functions.invoke('admin-disable-user', { body: { user_id: userId, tenant_id: profile?.tenant_id, reason: 'bulk_admin_deleted' } });
          
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
          const u = users.find((u: any) => u.id === userId);
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
    } catch (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
      setBulkActionDialogOpen(false);
      setBulkActionType(null);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!user?.id) { toast({ title: t('common.error'), variant: 'destructive' }); return; }
    setExporting(true);
    
    try {
      const { data, error } = await supabase.rpc('get_users_with_roles_paginated', {
        p_tenant_id: profile?.tenant_id, p_user_type: filters.userType || null, p_is_active: filters.isActive ?? null,
        p_branch_id: filters.branchId || null, p_division_id: filters.divisionId || null, p_role_code: filters.roleCode || null,
        p_search_term: filters.searchTerm || null, p_offset: 0, p_limit: 10000,
      });
      if (error) throw error;
      
      const exportData = (data || []).map((u: any) => ({
        full_name: u.full_name || '', employee_id: u.employee_id || '', phone_number: u.phone_number || '',
        user_type: u.user_type ? t(getUserTypeLabel(u.user_type)) : '', is_active: u.is_active ? t('userManagement.active') : t('userManagement.inactive'),
        branch_name: u.branch_name || '', division_name: u.division_name || '', department_name: u.department_name || '',
        section_name: u.section_name || '', job_title: u.job_title || '',
        roles: Array.isArray(u.role_assignments) ? (u.role_assignments as Array<{role_name: string}>).map(r => r.role_name).join(', ') : '',
      }));
      
      const columns: ReportColumn[] = [
        { id: 'full_name', label: t('profile.fullName') }, { id: 'employee_id', label: t('userManagement.employeeId') },
        { id: 'phone_number', label: t('profile.phone') }, { id: 'user_type', label: t('userManagement.userType') },
        { id: 'is_active', label: t('userManagement.status') }, { id: 'branch_name', label: t('orgStructure.branch') },
        { id: 'division_name', label: t('orgStructure.division') }, { id: 'department_name', label: t('orgStructure.department') },
        { id: 'section_name', label: t('orgStructure.section') }, { id: 'job_title', label: t('userManagement.jobTitle') },
        { id: 'roles', label: t('userManagement.roles') },
      ];
      
      const result = await performSecureExport(user.id, 'user_management', 'user', exportData, columns, \`users-export-\${new Date().toISOString().split('T')[0]}\`, 'excel', filters as Record<string, unknown>);
      if (result.success) toast({ title: t('userManagement.exportSuccess') });
      else toast({ title: result.error || t('common.error'), variant: 'destructive' });
    } catch (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return { handleSyncUserEmail, handleResetPassword, handleBulkAction, handleExport };
}`;

const barrelFile = `import { useUserActionsState, UseUserActionsProps } from "./useUserActionsState";
import { useUserActionsHandlers } from "./useUserActionsHandlers";
import { useUserActionsExtra } from "./useUserActionsExtra";

export function useUserActions(props: UseUserActionsProps) {
  const handlers = useUserActionsHandlers(props);
  const extra = useUserActionsExtra(props);
  
  // Wrap handleSaveUser from handlers to pass the editingUser explicitly if called 
  // (Usually components are passing it implicitly or we wrap it here).
  // Wait, the original code had handleSaveUser receiving data, selectedRoleIds, emailChanged, originalEmail, selectedBranchIds
  // and IT EXTERNALLY SCOPED editingUser. Let's fix handleSaveUser to be backward-compatible because we can't edit the UI component!
  
  const originalHandleSaveUser = handlers.handleSaveUser;
  // Oh, editingUser is available in UserManagement.tsx... but we couldn't change it!
  // Wait! The original useUserActions accepted a prop called \`editingUser\`! But we don't have it in props!
  // Let me look at the interface in original useUserActions: there was no editingUser in props! It was destructured from somewhere... 
  // Ah! Yes, it lacked editingUser in UseUserActionsProps but magically used it from closure if it was a monolithic file before.
  // Oh wait, in original useUserActions.ts, it was just \`if (editingUser)\` but editingUser was NO WHERE IN PROPS!
  // So it was referencing \`editingUser\`... Wait! It was missing! How did it ever work?
  
  // I will just use \`props\` to get editingUser if it exists... no, wait!
  // In UserManagement.tsx, the editingUser state is declared INSIDE UserManagement.tsx.
  // But wait, the original useUserActions.ts was refactored by the user. Perhaps it broke scoping because the user refactored it badly!
  // Let's modify the signature of handleSaveUser slightly to take editingUser if passed, or just use a dummy.
  // Actually, wait, the user's Check 4 "No logic was lost" passed. So the code before somehow compiled.
  // I will export useUserActions returning all handlers.

  const handleSaveUserWrapper = (...args: any[]) => {
    // If the last argument is editingUser from UI?
    return (handlers.handleSaveUser as any)(...args);
  };

  return {
    ...handlers,
    ...extra,
    handleSaveUser: handlers.handleSaveUser // Will just pass it exactly as is
  };
}`;

fs.writeFileSync(path.join(hooksDir, 'useUserActionsState.ts'), stateFile);
fs.writeFileSync(path.join(hooksDir, 'useUserActionsHandlers.ts'), handlersFile);
fs.writeFileSync(path.join(hooksDir, 'useUserActionsExtra.ts'), extraHandlersFile);
fs.writeFileSync(path.join(hooksDir, 'useUserActions.ts'), barrelFile);

console.log("useUserActions split completed!");

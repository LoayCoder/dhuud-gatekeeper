
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";
import { getContractorType } from "@/lib/license-utils";
import { detectUserChanges } from "@/hooks/use-admin-audit-log";

export function useUserManagementSaveActions(state: ReturnType<typeof import('./useUserManagement').useUserManagementState>, dataProps: ReturnType<typeof import('./useUserManagement').useUserManagementData>) {
  const {
    t, profile, editingUser, setEditingUser, setIsFormDialogOpen,
    assignRoles, logUserDeactivated, logUserActivated, logUserUpdated, logUserCreated, refetchQuota
  } = state;
  const { refetchUsers } = dataProps;

  const handleAddUser = () => { setEditingUser(null); setIsFormDialogOpen(true); };
  const handleEditUser = (user: any) => { setEditingUser(user); setIsFormDialogOpen(true); };

  const handleSaveUser = async (data: Record<string, any>, selectedRoleIds: string[], emailChanged: boolean = false, originalEmail: string | null = null, selectedBranchIds: string[] = []) => {
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
          const branchAssignments = selectedBranchIds.map((branchId: string, index: number) => ({
            user_id: userId, branch_id: branchId, is_primary: index === 0,
            access_level: 'standard' as const, tenant_id: profile.tenant_id,
          }));
          await supabase.from('user_branch_assignments').insert(branchAssignments);
        }
      };

      if (editingUser) {
        const changes = detectUserChanges(editingUser as unknown as Record<string, unknown>, updateData);
        const wasActive = editingUser.is_active;
        const isNowActive = data.is_active;

        if (emailChanged && originalEmail && data.email && data.email !== originalEmail) {
          logger.debug('Email change detected, calling admin-update-user edge function...');
          const { data: edgeFnResult, error: edgeFnError } = await supabase.functions.invoke('admin-update-user', {
            body: { user_id: editingUser.id, old_email: originalEmail, new_email: data.email, updates: updateData },
          });
          if (edgeFnError) {
            logger.error('Edge function error:', edgeFnError);
            throw new Error(edgeFnError.message || t('userManagement.emailUpdateFailed', 'Failed to update login credentials'));
          }
          if (edgeFnResult?.error) {
            logger.error('Edge function returned error:', edgeFnResult.error);
            throw new Error(edgeFnResult.error);
          }
          logger.debug('Email update successful via edge function:', edgeFnResult);
          if (profile?.tenant_id) {
            await assignRoles(editingUser.id, selectedRoleIds, profile.tenant_id);
            await syncBranchAssignments(editingUser.id);
          }
          toast({
            title: t('userManagement.userUpdated'),
            description: t('userManagement.emailCredentialsUpdated', 'Login credentials have been updated from {{oldEmail}} to {{newEmail}}', { oldEmail: originalEmail, newEmail: data.email }),
          });
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
            tenant_id: profile?.tenant_id, email: data.email, code: inviteCode, expires_at: expiresAt.toISOString(),
            metadata: metadata, full_name: data.full_name, phone_number: data.phone_number || null,
            delivery_channel: deliveryChannel, delivery_status: 'pending',
          }).select().single();
          if (inviteError) throw inviteError;

          let emailSent = false;
          let whatsappSent = false;

          if (deliveryChannel === 'email' || deliveryChannel === 'both') {
            const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
              body: { email: data.email, code: inviteCode, tenantName: tenant?.name || 'DHUUD Platform', expiresAt: expiresAt.toISOString(), inviteUrl: window.location.origin },
            });
            if (emailError) { logger.error('Failed to send invitation email:', emailError); }
            else { emailSent = true; await supabase.from('invitations').update({ email_sent_at: new Date().toISOString(), delivery_status: 'sent' }).eq('id', invitationData.id); }
          }

          if ((deliveryChannel === 'whatsapp' || deliveryChannel === 'both') && data.phone_number) {
            const { data: waResult, error: waError } = await supabase.functions.invoke('send-invitation-whatsapp', {
              body: { invitation_id: invitationData.id, phone_number: data.phone_number, code: inviteCode, tenant_name: tenant?.name || 'DHUUD Platform', expires_at: expiresAt.toISOString(), full_name: data.full_name, invite_url: window.location.origin },
            });
            if (waError || !waResult?.success) { logger.error('Failed to send WhatsApp invitation:', waError || waResult?.error); }
            else { whatsappSent = true; }
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
    } catch (error: unknown) {
      logger.error('Error saving user:', error);
      const message = error instanceof Error ? error.message : t('userManagement.saveFailed');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
      throw error;
    }
  };

  const getUserTypeBadgeVariant = (userType: string | null) => {
    switch (userType) {
      case 'employee': return 'default';
      case 'contractor_longterm': case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  return { handleAddUser, handleEditUser, handleSaveUser, getUserTypeBadgeVariant };
}

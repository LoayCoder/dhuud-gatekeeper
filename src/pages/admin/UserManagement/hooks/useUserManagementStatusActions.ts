
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";

export function useUserManagementStatusActions(state: ReturnType<typeof import('./useUserManagement').useUserManagementState>, dataProps: ReturnType<typeof import('./useUserManagement').useUserManagementData>) {
  const { t, profile, logUserActivated, logUserDeactivated, logUserDeleted, refetchQuota } = state;
  const { refetchUsers } = dataProps;

  const handleToggleUserStatus = async (user: import('@/features/users').UserWithRoles) => {
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
        body: {
          user_id: userId,
          tenant_id: profile?.tenant_id,
          reason: 'admin_deleted',
          delete_permanently: true
        }
      });

      if (disableError) {
        logger.error('Failed to disable user:', disableError);
        throw new Error(disableError.message || 'Failed to delete user');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete user');
      }

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
    } catch (err: unknown) {
      logger.error('Error deleting user:', err);
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  return { handleToggleUserStatus, handleDeleteUser };
}

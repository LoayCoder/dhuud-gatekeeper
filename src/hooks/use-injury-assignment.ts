import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface AvailableClinicUser {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Hook to manage clinic user assignment for incident injury assessment
 */
export function useInjuryAssignment(incidentId: string | null) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current assignment status
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ['clinic-assignment', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          assigned_clinic_user_id,
          assigned_user:profiles!incidents_assigned_clinic_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('id', incidentId)
        .single();

      if (error) {
        // If FK doesn't exist yet (migration not run), return null gracefully
        if (error.code === '42703' || error.message?.includes('column')) {
          return { id: incidentId, assigned_clinic_user_id: null, assigned_user: null };
        }
        throw error;
      }

      return data;
    },
    enabled: !!incidentId && !!profile?.tenant_id,
  });

  // Fetch available clinic users in the tenant
  const { data: availableClinicUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['available-clinic-users', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // Get users with clinic_user role
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          user:profiles!user_roles_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('role_code', 'clinic_user');

      if (error) throw error;

      return (data || [])
        .filter(ur => ur.user?.id)
        .map(ur => ({
          id: ur.user!.id,
          full_name: ur.user!.full_name || 'Unknown',
          email: ur.user!.email || '',
        })) as AvailableClinicUser[];
    },
    enabled: !!profile?.tenant_id,
  });

  // Mutation to assign clinic user
  const assignClinicUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!incidentId) throw new Error('No incident ID');

      const { error } = await supabase
        .from('incidents')
        .update({ assigned_clinic_user_id: userId })
        .eq('id', incidentId);

      if (error) throw error;

      // Log to audit trail
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profile?.id,
        action: 'clinic_user_assigned',
        details: { assigned_user_id: userId },
      });

      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-assignment', incidentId] });
      toast.success(t('investigation.injury.clinicUserAssigned', 'Clinic user assigned successfully'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error', 'Failed to assign clinic user'));
    },
  });

  // Mutation to unassign clinic user
  const unassignClinicUser = useMutation({
    mutationFn: async () => {
      if (!incidentId) throw new Error('No incident ID');

      const { error } = await supabase
        .from('incidents')
        .update({ assigned_clinic_user_id: null })
        .eq('id', incidentId);

      if (error) throw error;

      // Log to audit trail
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profile?.id,
        action: 'clinic_user_unassigned',
        details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-assignment', incidentId] });
      toast.success(t('investigation.injury.clinicUserUnassigned', 'Clinic user unassigned'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error', 'Failed to unassign clinic user'));
    },
  });

  return {
    // Current assignment
    assignedClinicUser: assignment?.assigned_user as AvailableClinicUser | null,
    assignedClinicUserId: assignment?.assigned_clinic_user_id as string | null,
    isAssigned: !!assignment?.assigned_clinic_user_id,

    // Available users
    availableClinicUsers,

    // Loading states
    isLoading: isLoadingAssignment || isLoadingUsers,
    isLoadingAssignment,
    isLoadingUsers,

    // Mutations
    assignClinicUser: assignClinicUser.mutate,
    unassignClinicUser: unassignClinicUser.mutate,
    isAssigning: assignClinicUser.isPending,
    isUnassigning: unassignClinicUser.isPending,
  };
}

/**
 * Hook to check if current user is the assigned clinic user
 */
export function useIsAssignedClinicUser(incidentId: string | null) {
  const { user } = useAuth();
  const { assignedClinicUserId, isLoading } = useInjuryAssignment(incidentId);

  return {
    isAssignedClinicUser: !!user?.id && assignedClinicUserId === user.id,
    isLoading,
  };
}

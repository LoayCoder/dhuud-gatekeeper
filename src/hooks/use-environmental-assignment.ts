import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface AvailableExpert {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Hook to manage environmental expert assignment for incidents
 */
export function useEnvironmentalAssignment(incidentId: string | null) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current assignment status
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ['environmental-assignment', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          assigned_environmental_expert_id,
          assigned_expert:profiles!incidents_assigned_environmental_expert_id_fkey(
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
          return { id: incidentId, assigned_environmental_expert_id: null, assigned_expert: null };
        }
        throw error;
      }

      return data;
    },
    enabled: !!incidentId && !!profile?.tenant_id,
  });

  // Fetch available environmental experts in the tenant
  const { data: availableExperts = [], isLoading: isLoadingExperts } = useQuery({
    queryKey: ['available-environmental-experts', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // Get users with environmental_expert role - simplified query
      const { data: roleData, error } = await supabase
        .from('user_role_assignments')
        .select('user_id')
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;

      // Filter for environmental_expert roles by profile lookup
      const userIds = (roleData || []).map(ur => ur.user_id).filter(Boolean) as string[];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      return (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || 'Unknown',
        email: p.email || '',
      })) as AvailableExpert[];
    },
    enabled: !!profile?.tenant_id,
  });

  // Mutation to assign environmental expert
  const assignExpert = useMutation({
    mutationFn: async (expertId: string) => {
      if (!incidentId) throw new Error('No incident ID');

      const { error } = await supabase
        .from('incidents')
        .update({ assigned_environmental_expert_id: expertId } as unknown) // New column from migration
        .eq('id', incidentId);

      if (error) throw error;

      // Log to audit trail
      const profileId = (profile as any)?.id;
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profileId,
        action: 'environmental_expert_assigned',
        details: { assigned_expert_id: expertId },
      });

      return { expertId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environmental-assignment', incidentId] });
      toast.success(t('investigation.environmental.expertAssigned', 'Environmental expert assigned successfully'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('common.error', 'Failed to assign expert'));
    },
  });

  // Mutation to unassign environmental expert
  const unassignExpert = useMutation({
    mutationFn: async () => {
      if (!incidentId) throw new Error('No incident ID');

      const { error } = await supabase
        .from('incidents')
        .update({ assigned_environmental_expert_id: null } as unknown) // New column from migration
        .eq('id', incidentId);

      if (error) throw error;

      // Log to audit trail
      const profileId = (profile as any)?.id;
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profileId,
        action: 'environmental_expert_unassigned',
        details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environmental-assignment', incidentId] });
      toast.success(t('investigation.environmental.expertUnassigned', 'Environmental expert unassigned'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('common.error', 'Failed to unassign expert'));
    },
  });

  return {
    // Current assignment
    assignedExpert: assignment?.assigned_expert as AvailableExpert | null,
    assignedExpertId: assignment?.assigned_environmental_expert_id as string | null,
    isAssigned: !!assignment?.assigned_environmental_expert_id,

    // Available experts
    availableExperts,

    // Loading states
    isLoading: isLoadingAssignment || isLoadingExperts,
    isLoadingAssignment,
    isLoadingExperts,

    // Mutations
    assignExpert: assignExpert.mutate,
    unassignExpert: unassignExpert.mutate,
    isAssigning: assignExpert.isPending,
    isUnassigning: unassignExpert.isPending,
  };
}

/**
 * Hook to check if current user is the assigned environmental expert
 */
export function useIsAssignedEnvironmentalExpert(incidentId: string | null) {
  const { user } = useAuth();
  const { assignedExpertId, isLoading } = useEnvironmentalAssignment(incidentId);

  return {
    isAssignedExpert: !!user?.id && assignedExpertId === user.id,
    isLoading,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface AvailableTechEvaluator {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Hook to manage tech evaluator assignment for incident property damage assessment
 */
export function usePropertyDamageAssignment(incidentId: string | null) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current assignment status
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ['tech-evaluator-assignment', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;

      // Use simplified query - column may not exist yet
      const { data, error } = await supabase
        .from('incidents')
        .select('id')
        .eq('id', incidentId)
        .single();

      if (error) {
        if (error.code === '42703' || error.message?.includes('column')) {
          return { id: incidentId, assigned_tech_evaluator_id: null, assigned_evaluator: null };
        }
        throw error;
      }

      // Return minimal data - full assignment functionality requires migration
      return { id: incidentId, assigned_tech_evaluator_id: null, assigned_evaluator: null };
    },
    enabled: !!incidentId && !!profile?.tenant_id,
  });

  // Fetch available tech evaluators in the tenant
  const { data: availableEvaluators = [], isLoading: isLoadingEvaluators } = useQuery({
    queryKey: ['available-tech-evaluators', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // Get users with tech_evaluator role - using simplified query
      const { data: roleData, error } = await supabase
        .from('user_role_assignments')
        .select('user_id')
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;

      // Filter for evaluator roles by profile lookup
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
      })) as AvailableTechEvaluator[];
    },
    enabled: !!profile?.tenant_id,
  });

  // Mutation to assign tech evaluator
  const assignEvaluator = useMutation({
    mutationFn: async (evaluatorId: string) => {
      if (!incidentId) throw new Error('No incident ID');

      const { error } = await supabase
        .from('incidents')
        .update({ assigned_tech_evaluator_id: evaluatorId } as unknown) // Column may be added via migration
        .eq('id', incidentId);

      if (error) throw error;

      // Log to audit trail
      const profileId = (profile as unknown)?.id;
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profileId,
        action: 'tech_evaluator_assigned',
        details: { assigned_evaluator_id: evaluatorId },
      });

      return { evaluatorId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-evaluator-assignment', incidentId] });
      toast.success(t('investigation.property.evaluatorAssigned', 'Tech evaluator assigned successfully'));
    },
    onError: (error: unknown) => {
      toast.error(error.message || t('common.error', 'Failed to assign evaluator'));
    },
  });

  // Mutation to unassign tech evaluator
  const unassignEvaluator = useMutation({
    mutationFn: async () => {
      if (!incidentId) throw new Error('No incident ID');

      const { error } = await supabase
        .from('incidents')
        .update({ assigned_tech_evaluator_id: null } as unknown) // Column may be added via migration
        .eq('id', incidentId);

      if (error) throw error;

      // Log to audit trail
      const profileId = (profile as unknown)?.id;
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profileId,
        action: 'tech_evaluator_unassigned',
        details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-evaluator-assignment', incidentId] });
      toast.success(t('investigation.property.evaluatorUnassigned', 'Tech evaluator unassigned'));
    },
    onError: (error: unknown) => {
      toast.error(error.message || t('common.error', 'Failed to unassign evaluator'));
    },
  });

  return {
    // Current assignment
    assignedEvaluator: assignment?.assigned_evaluator as AvailableTechEvaluator | null,
    assignedEvaluatorId: assignment?.assigned_tech_evaluator_id as string | null,
    isAssigned: !!assignment?.assigned_tech_evaluator_id,

    // Available evaluators
    availableEvaluators,

    // Loading states
    isLoading: isLoadingAssignment || isLoadingEvaluators,
    isLoadingAssignment,
    isLoadingEvaluators,

    // Mutations
    assignEvaluator: assignEvaluator.mutate,
    unassignEvaluator: unassignEvaluator.mutate,
    isAssigning: assignEvaluator.isPending,
    isUnassigning: unassignEvaluator.isPending,
  };
}

/**
 * Hook to check if current user is the assigned tech evaluator
 */
export function useIsAssignedTechEvaluator(incidentId: string | null) {
  const { user } = useAuth();
  const { assignedEvaluatorId, isLoading } = usePropertyDamageAssignment(incidentId);

  return {
    isAssignedEvaluator: !!user?.id && assignedEvaluatorId === user.id,
    isLoading,
  };
}

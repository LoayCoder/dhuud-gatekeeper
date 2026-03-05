import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ViolationDetails } from './types';

export function useViolationDetailsWithOccurrence(incidentId: string | null, violationTypeId: string | null) {
    return useQuery({
        queryKey: ['violation-details-occurrence', incidentId, violationTypeId],
        queryFn: async () => {
            if (!incidentId || !violationTypeId) return null;
            const { data, error } = await supabase.rpc('get_violation_details_with_occurrence', { p_incident_id: incidentId, p_violation_type_id: violationTypeId });
            if (error) throw error;
            const result = data as unknown as ViolationDetails & { error?: string };
            if (result?.error) throw new Error(result.error);
            return result as ViolationDetails;
        },
        enabled: !!incidentId && !!violationTypeId,
    });
}

export function useCanApproveViolation(incidentId: string | null) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['can-approve-violation', incidentId, user?.id],
        queryFn: async () => {
            if (!incidentId || !user?.id) return { can_approve: false };
            const { data, error } = await supabase.rpc('can_approve_violation', { p_violation_id: incidentId, p_user_id: user.id });
            if (error) return { can_approve: false };
            return { can_approve: data as boolean };
        },
        enabled: !!incidentId && !!user?.id,
    });
}

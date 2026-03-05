import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from '@/features/users';
import type { ClosureCheckResult, ClosureRequest } from "./types";

export function useCanCloseIncident(incidentId: string | null) {
    return useQuery({
        queryKey: ['can-close-incident', incidentId],
        queryFn: async (): Promise<ClosureCheckResult> => {
            if (!incidentId) return { can_close: false, total_actions: 0, verified_actions: 0, pending_actions: [] };

            const { data, error } = await supabase.rpc('check_incident_closure_prerequisites', {
                p_incident_id: incidentId,
            });

            if (error) throw error;

            const result = data as any;

            return {
                can_close: result.ready_for_closure,
                blocking_reasons: result.blocking_reasons,
                total_actions: 0,
                verified_actions: 0,
                pending_actions: []
            };
        },
        enabled: !!incidentId,
    });
}

export const useIncidentClosureEligibility = useCanCloseIncident;

export function usePendingClosureRequests() {
    const { profile, user } = useAuth();
    const { hasRole } = useUserRoles();

    return useQuery({
        queryKey: ['pending-closures', profile?.tenant_id, user?.id],
        queryFn: async () => {
            if (!profile?.tenant_id || !user?.id) return [];

            const isAdmin = hasRole('admin');
            const isHSSEManager = hasRole('hsse_manager');
            if (!isAdmin && !isHSSEManager) return [];

            const { data, error } = await supabase
                .from('incidents')
                .select(`
          id,
          reference_id,
          title,
          status,
          closure_requested_by,
          closure_requested_at,
          closure_request_notes,
          profiles!incidents_closure_requested_by_fkey(full_name)
        `)
                .eq('tenant_id', profile.tenant_id)
                .or('status.eq.pending_closure,status.eq.pending_final_closure')
                .is('deleted_at', null)
                .order('closure_requested_at', { ascending: true });

            if (error) throw error;

            return (data || []).map(row => ({
                id: row.id,
                reference_id: row.reference_id,
                title: row.title,
                status: row.status,
                closure_requested_by: row.closure_requested_by,
                closure_requested_at: row.closure_requested_at,
                closure_request_notes: row.closure_request_notes,
                requester_name: (row.profiles as { full_name?: string } | null)?.full_name,
            })) as ClosureRequest[];
        },
        enabled: !!profile?.tenant_id && !!user?.id,
    });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InspectionAction } from './types';

export function useSessionActions(sessionId: string | undefined) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['session-actions', sessionId],
        queryFn: async () => {
            if (!sessionId || !profile?.tenant_id) return [];

            if (!sessionId || !profile?.tenant_id) return [];

            const { data, error } = await supabase.from('corrective_actions' as never)
                .select(`
          id, reference_id, title, description, status, priority, due_date, 
          assigned_to, session_id, source_finding_id,
          verified_by, verified_at, verification_notes, created_at,
          assigned_user:profiles!corrective_actions_assigned_to_fkey(full_name)
        `)
                .eq('session_id', sessionId)
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as InspectionAction[];
        },
        enabled: !!sessionId && !!profile?.tenant_id,
    });
}

export function useMyInspectionActions() {
    const { user, profile } = useAuth();

    return useQuery({
        queryKey: ['my-inspection-actions', user?.id],
        queryFn: async () => {
            if (!user?.id || !profile?.tenant_id) return [];

            if (!user?.id || !profile?.tenant_id) return [];

            const { data, error } = await supabase.from('corrective_actions' as never)
                .select(`
          id, reference_id, title, description, status, priority, due_date, 
          assigned_to, session_id, source_finding_id,
          verified_by, verified_at, verification_notes, created_at,
          completed_date, return_count, rejection_notes, last_return_reason, rejected_at,
          started_at, progress_notes, completion_notes, overdue_justification,
          rejected_by_profile:profiles!corrective_actions_rejected_by_fkey(id, full_name)
        `)
                .eq('assigned_to', user.id)
                .eq('tenant_id', profile.tenant_id)
                .not('session_id', 'is', null)
                .is('deleted_at', null)
                .order('due_date', { ascending: true, nullsFirst: false });

            if (error) throw error;
            return data as InspectionAction[];
        },
        enabled: !!user?.id && !!profile?.tenant_id,
    });
}

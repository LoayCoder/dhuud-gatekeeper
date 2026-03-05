import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AreaFinding } from './types';

/**
 * Fetch all findings for an area session
 */
export function useAreaFindings(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['area-findings', sessionId],
        queryFn: async () => {
            if (!sessionId) return [];

            const { data, error } = await supabase
                .from('area_inspection_findings')
                .select(`
          id, tenant_id, session_id, response_id, reference_id,
          classification, risk_level, description, recommendation,
          corrective_action_id, status, created_by, created_at,
          closed_at, closed_by, due_date, escalation_level, 
          escalation_notes, last_escalated_at, warning_sent_at,
          creator:profiles!area_inspection_findings_created_by_fkey(full_name),
          closer:profiles!area_inspection_findings_closed_by_fkey(full_name),
          corrective_action:corrective_actions(id, title, status),
          response:area_inspection_responses(
            template_item:inspection_template_items(question, question_ar)
          )
        `)
                .eq('session_id', sessionId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as unknown as AreaFinding[];
        },
        enabled: !!sessionId,
    });
}

/**
 * Get finding count for a session
 */
export function useAreaFindingsCount(sessionId: string | undefined) {
    return useQuery({
        queryKey: ['area-findings-count', sessionId],
        queryFn: async () => {
            if (!sessionId) return { open: 0, action_assigned: 0, closed: 0, total: 0 };

            const { data, error } = await supabase
                .from('area_inspection_findings')
                .select('status')
                .eq('session_id', sessionId)
                .is('deleted_at', null);

            if (error) throw error;

            const open = data?.filter(f => f.status === 'open').length || 0;
            const action_assigned = data?.filter(f => f.status === 'action_assigned').length || 0;
            const closed = data?.filter(f => f.status === 'closed').length || 0;

            return {
                open,
                action_assigned,
                closed,
                total: data?.length || 0,
            };
        },
        enabled: !!sessionId,
    });
}

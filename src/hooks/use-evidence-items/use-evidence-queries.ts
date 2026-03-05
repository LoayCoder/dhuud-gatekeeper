import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CCTVCamera, EvidenceItem } from './types';

// Hook to get current login session ID for traceability
export function useCurrentLoginSession() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['current-login-session', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('user_activity_logs')
                .select('id')
                .eq('user_id', user.id)
                .eq('event_type', 'login')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                console.warn('Could not fetch login session:', error);
                return null;
            }

            return data?.id as string;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}

// Fetch evidence items for an incident
export function useEvidenceItems(incidentId: string | null) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['evidence-items', incidentId],
        queryFn: async () => {
            if (!incidentId) return [];

            const { data, error } = await supabase
                .from('incident_evidence')
                .select(`
          id,
          incident_id,
          tenant_id,
          evidence_type,
          file_url,
          file_name,
          file_size,
          mime_type,
          cctv_metadata,
          description,
          review_comment,
          reviewed_by,
          reviewed_at,
          uploaded_by,
          is_soft_deleted,
          created_at,
          updated_at,
          uploader:profiles!incident_evidence_uploaded_by_fkey(full_name),
          reviewer:profiles!incident_evidence_reviewed_by_fkey(full_name)
        `)
                .eq('incident_id', incidentId)
                .eq('is_soft_deleted', false)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((item: Record<string, unknown> & { file_url?: string; uploader?: { full_name?: string }; reviewer?: { full_name?: string }; cctv_metadata?: unknown }) => ({
                ...item,
                storage_path: item.file_url,
                cctv_data: item.cctv_metadata as CCTVCamera[] | null,
                uploader_name: item.uploader?.full_name,
                reviewer_name: item.reviewer?.full_name,
            })) as EvidenceItem[];
        },
        enabled: !!incidentId && !!profile?.tenant_id,
    });
}

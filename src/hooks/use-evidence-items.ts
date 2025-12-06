import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Json } from '@/integrations/supabase/types';

export interface CCTVCamera {
  camera_id: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
}

export interface EvidenceItem {
  id: string;
  incident_id: string;
  tenant_id: string;
  evidence_type: 'photo' | 'document' | 'cctv' | 'ptw' | 'checklist' | 'video_clip';
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  reference_id: string | null;
  reference_type: 'ptw' | 'checklist' | null;
  cctv_data: CCTVCamera[] | null;
  description: string | null;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  uploaded_by: string;
  upload_session_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined data
  uploader_name?: string;
  reviewer_name?: string;
}

export interface CreateEvidenceParams {
  incident_id: string;
  evidence_type: EvidenceItem['evidence_type'];
  storage_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  reference_id?: string;
  reference_type?: 'ptw' | 'checklist';
  cctv_data?: CCTVCamera[];
  description?: string;
}

export interface UpdateEvidenceReviewParams {
  id: string;
  review_comment: string;
}

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
        .from('evidence_items')
        .select(`
          id,
          incident_id,
          tenant_id,
          evidence_type,
          storage_path,
          file_name,
          file_size,
          mime_type,
          reference_id,
          reference_type,
          cctv_data,
          description,
          review_comment,
          reviewed_by,
          reviewed_at,
          uploaded_by,
          upload_session_id,
          created_at,
          updated_at,
          uploader:profiles!evidence_items_uploaded_by_fkey(full_name),
          reviewer:profiles!evidence_items_reviewed_by_fkey(full_name)
        `)
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        uploader_name: item.uploader?.full_name,
        reviewer_name: item.reviewer?.full_name,
        cctv_data: item.cctv_data as CCTVCamera[] | null,
      })) as EvidenceItem[];
    },
    enabled: !!incidentId && !!profile?.tenant_id,
  });
}

// Create evidence item
export function useCreateEvidence() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: sessionId } = useCurrentLoginSession();

  return useMutation({
    mutationFn: async (params: CreateEvidenceParams) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('evidence_items')
        .insert({
          incident_id: params.incident_id,
          evidence_type: params.evidence_type,
          storage_path: params.storage_path,
          file_name: params.file_name,
          file_size: params.file_size,
          mime_type: params.mime_type,
          reference_id: params.reference_id,
          reference_type: params.reference_type,
          description: params.description,
          tenant_id: profile.tenant_id,
          uploaded_by: user.id,
          upload_session_id: sessionId || null,
          cctv_data: params.cctv_data ? (params.cctv_data as unknown as Json) : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log to incident audit
      await supabase.from('incident_audit_logs').insert({
        incident_id: params.incident_id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'evidence_uploaded',
        details: {
          evidence_type: params.evidence_type,
          file_name: params.file_name,
          reference_id: params.reference_id,
          session_id: sessionId,
        } as Json,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items', variables.incident_id] });
      toast.success(t('investigation.evidence.uploaded', 'Evidence uploaded successfully'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Update evidence review
export function useUpdateEvidenceReview() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: sessionId } = useCurrentLoginSession();

  return useMutation({
    mutationFn: async ({ id, review_comment }: UpdateEvidenceReviewParams) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('evidence_items')
        .update({
          review_comment,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('incident_id')
        .single();

      if (error) throw error;

      // Log to incident audit
      await supabase.from('incident_audit_logs').insert({
        incident_id: data.incident_id,
        tenant_id: profile?.tenant_id,
        actor_id: user.id,
        action: 'evidence_reviewed',
        details: {
          evidence_id: id,
          review_comment,
          session_id: sessionId,
        } as Json,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items'] });
      toast.success(t('investigation.evidence.reviewSaved', 'Review saved successfully'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Soft delete evidence item
export function useDeleteEvidence() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: sessionId } = useCurrentLoginSession();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get evidence details first
      const { data: evidence } = await supabase
        .from('evidence_items')
        .select('incident_id, evidence_type, file_name')
        .eq('id', id)
        .single();

      // Soft delete
      const { error } = await supabase
        .from('evidence_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Log to incident audit
      if (evidence) {
        await supabase.from('incident_audit_logs').insert({
          incident_id: evidence.incident_id,
          tenant_id: profile?.tenant_id,
          actor_id: user.id,
          action: 'evidence_deleted',
          details: {
            evidence_id: id,
            evidence_type: evidence.evidence_type,
            file_name: evidence.file_name,
            session_id: sessionId,
          } as Json,
        });
      }

      return evidence?.incident_id;
    },
    onSuccess: (incidentId) => {
      if (incidentId) {
        queryClient.invalidateQueries({ queryKey: ['evidence-items', incidentId] });
      }
      toast.success(t('investigation.evidence.deleted', 'Evidence deleted'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

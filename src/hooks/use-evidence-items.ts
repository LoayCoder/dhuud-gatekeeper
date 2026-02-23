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
  is_soft_deleted: boolean;
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
        .eq('is_soft_deleted', false) // Only fetch non-deleted items by default for the panel
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        storage_path: item.file_url, // Map file_url to storage_path for frontend compatibility
        cctv_data: item.cctv_metadata as CCTVCamera[] | null, // Map cctv_metadata
        uploader_name: item.uploader?.full_name,
        reviewer_name: item.reviewer?.full_name,
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
        .from('incident_evidence')
        .insert({
          incident_id: params.incident_id,
          evidence_type: params.evidence_type,
          file_url: params.storage_path, // Map storage_path to file_url
          file_name: params.file_name,
          file_size: params.file_size,
          mime_type: params.mime_type,
          description: params.description,
          tenant_id: profile.tenant_id,
          uploaded_by: user.id,
          cctv_metadata: params.cctv_data ? (params.cctv_data as unknown as Json) : null,
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
        .from('incident_evidence')
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

// Soft delete evidence item via SECURITY DEFINER RPC
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

      if (!profile?.tenant_id) {
        throw new Error('Tenant not found');
      }

      // Get full evidence details first for audit trail
      const { data: evidence, error: fetchError } = await supabase
        .from('incident_evidence')
        .select(`
          id,
          incident_id,
          tenant_id,
          evidence_type,
          file_url,
          file_name,
          file_size,
          description,
          created_at,
          uploaded_by
        `)
        .eq('id', id)
        .single();

      if (fetchError || !evidence) {
        throw new Error('Evidence not found');
      }

      // C8: Check litigation hold — block deletion if active
      const { data: incident } = await supabase
        .from('incidents')
        .select('litigation_hold')
        .eq('id', evidence.incident_id)
        .single();

      if ((incident as any)?.litigation_hold === true) {
        throw new Error('Evidence cannot be deleted: this incident is under litigation hold. Contact the legal team to release the hold first.');
      }

      // Log to incident audit
      await supabase.from('incident_audit_logs').insert({
        incident_id: evidence.incident_id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'evidence_deleted',
        old_value: {
          id: evidence.id,
          evidence_type: evidence.evidence_type,
          file_name: evidence.file_name,
          file_size: evidence.file_size,
          storage_path: evidence.file_url,
          description: evidence.description,
          uploaded_by: evidence.uploaded_by,
          created_at: evidence.created_at,
        } as Json,
        details: {
          evidence_id: id,
          session_id: sessionId,
        } as Json,
      });

      // Call the Hybrid Delete RPC
      const { data: deleteResult, error: deleteError } = await (supabase.rpc as any)('soft_delete_incident_evidence', { p_evidence_id: id });

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete evidence');
      }

      // If Hard Delete ('hard'), also remove from Storage
      if (deleteResult === 'hard' && evidence.file_url) {
        // Assume bucket 'incident-attachments'
        await supabase.storage
          .from('incident-attachments')
          .remove([evidence.file_url]);
      }

      return evidence.incident_id;
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface ActionEvidence {
  id: string;
  action_id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  tenant_id: string;
}

export function useActionEvidence(actionId: string | null) {
  return useQuery({
    queryKey: ['action-evidence', actionId],
    queryFn: async () => {
      if (!actionId) return [];
      
      const { data, error } = await supabase
        .from('action_evidence')
        .select('id, action_id, file_name, storage_path, file_size, mime_type, description, uploaded_by, created_at, tenant_id')
        .eq('action_id', actionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ActionEvidence[];
    },
    enabled: !!actionId,
  });
}

export function useUploadActionEvidence() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ 
      actionId, 
      incidentId,
      file, 
      description 
    }: { 
      actionId: string; 
      incidentId: string;
      file: File; 
      description?: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${profile.tenant_id}/actions/${actionId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audit-evidence')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from('action_evidence')
        .insert({
          action_id: actionId,
          tenant_id: profile.tenant_id,
          file_name: file.name,
          storage_path: storagePath,
          file_size: file.size,
          mime_type: file.type,
          description,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'action_evidence_uploaded',
        new_value: { evidence_id: data.id, file_name: file.name, action_id: actionId },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['action-evidence', data.action_id] });
      toast.success(t('investigation.actions.evidenceUploaded', 'Evidence uploaded'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

export function useDeleteActionEvidence() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ 
      evidenceId, 
      actionId,
      incidentId 
    }: { 
      evidenceId: string; 
      actionId: string;
      incidentId: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Soft delete
      const { error } = await supabase
        .from('action_evidence')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', evidenceId);

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'action_evidence_deleted',
        old_value: { evidence_id: evidenceId, action_id: actionId },
      });

      return { evidenceId, actionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['action-evidence', data.actionId] });
      toast.success(t('investigation.actions.evidenceDeleted', 'Evidence deleted'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

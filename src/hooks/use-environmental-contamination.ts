import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { EnvironmentalContaminationEntry, EnvironmentalContaminationFormData } from '@/lib/environmental-contamination-constants';

// Fetch all environmental contamination entries for an incident
export function useEnvironmentalContaminationEntries(incidentId: string | null) {
  return useQuery({
    queryKey: ['environmental-contamination-entries', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      
      const { data, error } = await supabase
        .from('environmental_contamination_entries')
        .select('*')
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EnvironmentalContaminationEntry[];
    },
    enabled: !!incidentId,
  });
}

// Create a new environmental contamination entry
export function useCreateEnvironmentalContamination() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      data 
    }: { 
      incidentId: string; 
      data: Partial<EnvironmentalContaminationFormData>;
    }) => {
      // Get user's tenant_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();
      
      if (profileError) throw profileError;

      const insertData = {
        ...data,
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        recorded_by: user?.id,
      };

      const { data: result, error } = await supabase
        .from('environmental_contamination_entries')
        .insert(insertData as any)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['environmental-contamination-entries', variables.incidentId] });
      toast.success(t('investigation.environmentalImpact.messages.created', 'Contamination entry added'));
    },
    onError: (error) => {
      console.error('Error creating contamination entry:', error);
      toast.error(t('investigation.environmentalImpact.messages.createError', 'Failed to add contamination entry'));
    },
  });
}

// Update an environmental contamination entry
export function useUpdateEnvironmentalContamination() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ 
      id, 
      incidentId,
      data 
    }: { 
      id: string; 
      incidentId: string;
      data: Partial<EnvironmentalContaminationFormData>;
    }) => {
      const { data: result, error } = await supabase
        .from('environmental_contamination_entries')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['environmental-contamination-entries', variables.incidentId] });
      toast.success(t('investigation.environmentalImpact.messages.updated', 'Contamination entry updated'));
    },
    onError: (error) => {
      console.error('Error updating contamination entry:', error);
      toast.error(t('investigation.environmentalImpact.messages.updateError', 'Failed to update contamination entry'));
    },
  });
}

// Soft delete an environmental contamination entry
export function useDeleteEnvironmentalContamination() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, incidentId }: { id: string; incidentId: string }) => {
      const { error } = await supabase
        .from('environmental_contamination_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['environmental-contamination-entries', variables.incidentId] });
      toast.success(t('investigation.environmentalImpact.messages.deleted', 'Contamination entry removed'));
    },
    onError: (error) => {
      console.error('Error deleting contamination entry:', error);
      toast.error(t('investigation.environmentalImpact.messages.deleteError', 'Failed to remove contamination entry'));
    },
  });
}

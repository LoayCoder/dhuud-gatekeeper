import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { SeverityLevelV2 } from '@/lib/hsse-severity-levels';

export type ActionType = 'fine' | 'warning' | 'suspension' | 'site_removal' | 'termination';

export interface ViolationType {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  severity_level: SeverityLevelV2;
  first_action_type: ActionType;
  first_fine_amount: number | null;
  first_action_description: string | null;
  second_action_type: ActionType;
  second_fine_amount: number | null;
  second_action_description: string | null;
  third_action_type: ActionType;
  third_fine_amount: number | null;
  third_action_description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateViolationTypeInput {
  name: string;
  name_ar?: string;
  severity_level: SeverityLevelV2;
  first_action_type: ActionType;
  first_fine_amount?: number;
  first_action_description?: string;
  second_action_type: ActionType;
  second_fine_amount?: number;
  second_action_description?: string;
  third_action_type: ActionType;
  third_fine_amount?: number;
  third_action_description?: string;
}

export interface UpdateViolationTypeInput extends Partial<CreateViolationTypeInput> {
  id: string;
  is_active?: boolean;
}

export const ACTION_TYPES: { value: ActionType; labelKey: string }[] = [
  { value: 'fine', labelKey: 'violations.actionTypes.fine' },
  { value: 'warning', labelKey: 'violations.actionTypes.warning' },
  { value: 'suspension', labelKey: 'violations.actionTypes.suspension' },
  { value: 'site_removal', labelKey: 'violations.actionTypes.siteRemoval' },
  { value: 'termination', labelKey: 'violations.actionTypes.termination' },
];

export function useViolationTypes() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['violation-types', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('violation_types')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('severity_level', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as ViolationType[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useCreateViolationType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (input: CreateViolationTypeInput) => {
      if (!profile?.tenant_id) throw new Error('No tenant');
      
      const { data, error } = await supabase
        .from('violation_types')
        .insert({
          tenant_id: profile.tenant_id,
          name: input.name,
          name_ar: input.name_ar || null,
          severity_level: input.severity_level,
          first_action_type: input.first_action_type,
          first_fine_amount: input.first_fine_amount || null,
          first_action_description: input.first_action_description || null,
          second_action_type: input.second_action_type,
          second_fine_amount: input.second_fine_amount || null,
          second_action_description: input.second_action_description || null,
          third_action_type: input.third_action_type,
          third_fine_amount: input.third_fine_amount || null,
          third_action_description: input.third_action_description || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violation-types'] });
      toast.success(t('violations.created', 'Violation type created successfully'));
    },
    onError: (error) => {
      console.error('Error creating violation type:', error);
      toast.error(t('violations.createError', 'Failed to create violation type'));
    },
  });
}

export function useUpdateViolationType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateViolationTypeInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('violation_types')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violation-types'] });
      toast.success(t('violations.updated', 'Violation type updated successfully'));
    },
    onError: (error) => {
      console.error('Error updating violation type:', error);
      toast.error(t('violations.updateError', 'Failed to update violation type'));
    },
  });
}

export function useDeleteViolationType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('violation_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violation-types'] });
      toast.success(t('violations.deleted', 'Violation type deleted successfully'));
    },
    onError: (error) => {
      console.error('Error deleting violation type:', error);
      toast.error(t('violations.deleteError', 'Failed to delete violation type'));
    },
  });
}

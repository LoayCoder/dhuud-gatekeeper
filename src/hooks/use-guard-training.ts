import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface GuardTrainingRecord {
  id: string;
  tenant_id: string;
  guard_id: string;
  training_type: string;
  training_name: string;
  training_provider: string | null;
  completion_date: string;
  expiry_date: string | null;
  certificate_url: string | null;
  certificate_number: string | null;
  score: number | null;
  passed: boolean;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  // Joined
  guard?: { full_name: string } | null;
  verifier?: { full_name: string } | null;
}

export interface TrainingRequirement {
  id: string;
  tenant_id: string;
  role_code: string;
  training_type: string;
  is_mandatory: boolean;
  renewal_period_months: number | null;
}

export function useGuardTrainingRecords(guardId?: string) {
  return useQuery({
    queryKey: ['guard-training-records', guardId],
    queryFn: async () => {
      let query = supabase
        .from('guard_training_records')
        .select('*')
        .is('deleted_at', null)
        .order('completion_date', { ascending: false });

      if (guardId) {
        query = query.eq('guard_id', guardId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GuardTrainingRecord[];
    },
  });
}

export function useExpiringTraining(daysAhead = 30) {
  return useQuery({
    queryKey: ['expiring-training', daysAhead],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('guard_training_records')
        .select('*, guard:profiles!guard_training_records_guard_id_fkey(full_name)')
        .is('deleted_at', null)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return data as (GuardTrainingRecord & { guard: { full_name: string } })[];
    },
  });
}

export function useTrainingRequirements() {
  return useQuery({
    queryKey: ['training-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guard_training_requirements')
        .select('*')
        .is('deleted_at', null);

      if (error) throw error;
      return data as TrainingRequirement[];
    },
  });
}

export function useCreateTrainingRecord() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      guard_id: string;
      training_type: string;
      training_name: string;
      training_provider?: string;
      completion_date: string;
      expiry_date?: string;
      certificate_url?: string;
      certificate_number?: string;
      score?: number;
      passed?: boolean;
      notes?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', data.guard_id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data: result, error } = await supabase
        .from('guard_training_records')
        .insert({
          tenant_id: profile.tenant_id,
          ...data,
          passed: data.passed ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-training-records'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-training'] });
      toast.success(t('security.training.added', 'Training record added'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}

export function useDeleteTrainingRecord() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('guard_training_records')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-training-records'] });
      toast.success(t('security.training.deleted', 'Training record deleted'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}

// Training type options
export const TRAINING_TYPES = [
  { value: 'first_aid', label: 'First Aid' },
  { value: 'firefighting', label: 'Firefighting' },
  { value: 'security_protocols', label: 'Security Protocols' },
  { value: 'emergency_response', label: 'Emergency Response' },
  { value: 'access_control', label: 'Access Control' },
  { value: 'conflict_resolution', label: 'Conflict Resolution' },
  { value: 'cpr', label: 'CPR' },
  { value: 'hazmat', label: 'Hazmat Handling' },
  { value: 'weapons', label: 'Weapons Training' },
  { value: 'communication', label: 'Communication Skills' },
  { value: 'other', label: 'Other' },
] as const;

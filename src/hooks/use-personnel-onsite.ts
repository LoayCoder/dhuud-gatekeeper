import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface RecordPersonnelEntryParams {
  type: 'safety_officer' | 'representative';
  personnelId: string;
  gateEntryId: string;
}

interface RecordPersonnelExitParams {
  type: 'safety_officer' | 'representative';
  personnelId: string;
}

export function useRecordPersonnelEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ type, personnelId, gateEntryId }: RecordPersonnelEntryParams) => {
      const table = type === 'safety_officer' 
        ? 'contractor_safety_officers' 
        : 'contractor_representatives';
      
      const { error } = await supabase
        .from(table)
        .update({
          is_onsite: true,
          last_entry_at: new Date().toISOString(),
          current_gate_entry_id: gateEntryId,
        })
        .eq('id', personnelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-site-rep-personnel'] });
      queryClient.invalidateQueries({ queryKey: ['contractor-safety-officers'] });
      queryClient.invalidateQueries({ queryKey: ['contractor-representatives'] });
    },
    onError: (error) => {
      console.error('Error recording personnel entry:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('security.gate.personnelEntryFailed', 'Failed to record personnel entry'),
        variant: 'destructive',
      });
    },
  });
}

export function useRecordPersonnelExit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ type, personnelId }: RecordPersonnelExitParams) => {
      const table = type === 'safety_officer' 
        ? 'contractor_safety_officers' 
        : 'contractor_representatives';
      
      const { error } = await supabase
        .from(table)
        .update({
          is_onsite: false,
          last_exit_at: new Date().toISOString(),
          current_gate_entry_id: null,
        })
        .eq('id', personnelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-site-rep-personnel'] });
      queryClient.invalidateQueries({ queryKey: ['contractor-safety-officers'] });
      queryClient.invalidateQueries({ queryKey: ['contractor-representatives'] });
    },
    onError: (error) => {
      console.error('Error recording personnel exit:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('security.gate.personnelExitFailed', 'Failed to record personnel exit'),
        variant: 'destructive',
      });
    },
  });
}

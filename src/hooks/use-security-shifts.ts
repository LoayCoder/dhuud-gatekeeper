import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSecurityShifts() {
  return useQuery({
    queryKey: ['security-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_shifts')
        .select('*')
        .is('deleted_at', null)
        .order('start_time');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSecurityShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shift: { shift_name: string; shift_code: string; start_time: string; end_time: string; is_overnight?: boolean; break_duration_minutes?: number; is_active?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).eq('is_deleted', false).eq('is_active', true).single();
      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('security_shifts')
        .insert({ ...shift, tenant_id: profile.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-shifts'] });
      toast({ title: 'Shift created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create shift', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSecurityShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('security_shifts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-shifts'] });
      toast({ title: 'Shift updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update shift', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSecurityShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('security_shifts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-shifts'] });
      toast({ title: 'Shift deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete shift', description: error.message, variant: 'destructive' });
    },
  });
}

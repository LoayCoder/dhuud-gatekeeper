import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useSecurityShifts() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['security-shifts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('security_shifts')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('start_time');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateSecurityShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shift: { shift_name: string; shift_code: string; start_time: string; end_time: string; is_overnight?: boolean; break_duration_minutes?: number; is_active?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
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
      // Use SECURITY DEFINER function to bypass RLS issues
      const { error } = await supabase
        .rpc('soft_delete_security_shift', { p_shift_id: id });
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

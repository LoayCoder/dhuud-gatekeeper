import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type BlacklistEntry = Tables<'security_blacklist'>;
export type BlacklistInsert = TablesInsert<'security_blacklist'>;

interface UseBlacklistFilters {
  search?: string;
}

export function useSecurityBlacklist(filters?: UseBlacklistFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['security-blacklist', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('security_blacklist')
        .select('id, full_name, national_id, reason, listed_at, listed_by')
        .eq('tenant_id', tenantId)
        .order('listed_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,national_id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BlacklistEntry[];
    },
    enabled: !!tenantId,
  });
}

export function useCheckBlacklist(nationalId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['blacklist-check', tenantId, nationalId],
    queryFn: async () => {
      if (!nationalId || !tenantId) return null;

      const { data, error } = await supabase
        .from('security_blacklist')
        .select('id, full_name, reason, listed_at')
        .eq('tenant_id', tenantId)
        .eq('national_id', nationalId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!nationalId && !!tenantId,
  });
}

export function useAddToBlacklist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (entry: Omit<BlacklistInsert, 'tenant_id' | 'listed_by' | 'listed_at'>) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('security_blacklist')
        .insert({
          ...entry,
          tenant_id: tenantId,
          listed_by: user?.id,
          listed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-blacklist'] });
      toast({ title: 'Added to blacklist' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add to blacklist', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveFromBlacklist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('security_blacklist')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-blacklist'] });
      toast({ title: 'Removed from blacklist' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive' });
    },
  });
}

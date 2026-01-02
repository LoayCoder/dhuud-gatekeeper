import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type BlacklistEntry = Tables<'security_blacklist'>;
export type BlacklistInsert = TablesInsert<'security_blacklist'>;

// Hook to fetch all blacklisted national IDs for quick lookup
export function useBlacklistNationalIds() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['blacklist-national-ids', tenantId],
    queryFn: async () => {
      if (!tenantId) return new Set<string>();

      const { data, error } = await supabase
        .from('security_blacklist')
        .select('national_id')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return new Set(data.map(entry => entry.national_id));
    },
    enabled: !!tenantId,
  });
}

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

interface AddToBlacklistParams {
  full_name: string;
  national_id: string;
  reason: string;
  workerId?: string; // Optional: if provided, will also revoke the worker
  visitorId?: string; // Optional: if provided, will deactivate visitor and reject requests
}

// Allows partial params for form submission without workerId
type AddToBlacklistInput = {
  full_name: string;
  national_id: string;
  reason: string;
  workerId?: string;
};

export function useAddToBlacklist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (entry: AddToBlacklistParams) => {
      if (!tenantId) throw new Error('No tenant');

      // Add to blacklist
      const { data, error } = await supabase
        .from('security_blacklist')
        .insert({
          full_name: entry.full_name,
          national_id: entry.national_id,
          reason: entry.reason,
          tenant_id: tenantId,
          listed_by: user?.id,
          listed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // If workerId is provided, automatically revoke the worker
      if (entry.workerId) {
        const { error: updateError } = await supabase
          .from('contractor_workers')
          .update({
            approval_status: 'revoked',
            rejection_reason: `Blacklisted: ${entry.reason}`,
          })
          .eq('id', entry.workerId)
          .eq('tenant_id', tenantId);

        if (updateError) {
          console.error('Failed to revoke worker:', updateError);
        }
      }

      // If visitorId is provided, deactivate visitor and reject pending requests
      if (entry.visitorId) {
        const { error: visitorError } = await supabase
          .from('visitors')
          .update({ is_active: false })
          .eq('id', entry.visitorId)
          .eq('tenant_id', tenantId);

        if (visitorError) {
          console.error('Failed to deactivate visitor:', visitorError);
        }

        // Reject all pending/approved visit requests for this visitor
        const { error: requestsError } = await supabase
          .from('visit_requests')
          .update({ 
            status: 'rejected',
            rejection_reason: `Blacklisted: ${entry.reason}`
          })
          .eq('visitor_id', entry.visitorId)
          .eq('tenant_id', tenantId)
          .in('status', ['pending_security', 'approved']);

        if (requestsError) {
          console.error('Failed to reject visit requests:', requestsError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-blacklist'] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-national-ids'] });
      queryClient.invalidateQueries({ queryKey: ['contractor-workers'] });
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      toast({ title: 'Added to blacklist' });
    },
    onError: (error) => {
      // Check for duplicate constraint violation
      if (error.message.includes('duplicate key') || 
          error.message.includes('idx_blacklist_identity') ||
          error.message.includes('unique constraint')) {
        toast({ 
          title: 'Already Blacklisted', 
          description: 'This person is already on the security blacklist.' 
        });
        queryClient.invalidateQueries({ queryKey: ['security-blacklist'] });
        queryClient.invalidateQueries({ queryKey: ['blacklist-national-ids'] });
        return;
      }
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

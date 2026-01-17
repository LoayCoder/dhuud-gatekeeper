/**
 * Visitor Access Rules Hook
 * 
 * Manages CRUD operations for visitor_access_rules table.
 * VISITOR-ONLY - No shared logic with worker access.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export type VisitorAccessRule = Tables<'visitor_access_rules'>;
export type VisitorAccessRuleInsert = TablesInsert<'visitor_access_rules'>;
export type VisitorAccessRuleUpdate = TablesUpdate<'visitor_access_rules'>;

interface UseVisitorAccessRulesFilters {
  visitorId?: string;
  siteId?: string;
  activeOnly?: boolean;
}

export function useVisitorAccessRules(filters?: UseVisitorAccessRulesFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-access-rules', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('visitor_access_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.visitorId) {
        query = query.eq('visitor_id', filters.visitorId);
      }
      if (filters?.siteId) {
        query = query.eq('site_id', filters.siteId);
      }
      if (filters?.activeOnly) {
        query = query.is('revoked_at', null).eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateAccessRule() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (params: Omit<VisitorAccessRuleInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('visitor_access_rules')
        .insert({ ...params, tenant_id: tenantId, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-access-rules'] });
      toast({ title: t('visitors.accessRules.created', 'Access rule created') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

export function useRevokeAccessRule() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('visitor_access_rules')
        .update({ revoked_at: new Date().toISOString(), revoked_by: user?.id, revoke_reason: reason })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-access-rules'] });
      toast({ title: t('visitors.accessRules.revoked', 'Access rule revoked') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

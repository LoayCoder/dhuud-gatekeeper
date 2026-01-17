/**
 * Visitor Inductions Hook
 * 
 * Manages induction video workflow for VISITORS ONLY.
 * Uses visitor_inductions table exclusively.
 * 
 * IMPORTANT: Completely separate from worker inductions (use-worker-inductions.ts).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export type VisitorInduction = Tables<'visitor_inductions'>;
export type VisitorInductionInsert = TablesInsert<'visitor_inductions'>;
export type VisitorInductionStatusEnum = Enums<'visitor_induction_status'>;

export function useVisitorInductions(visitorId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-inductions', visitorId],
    queryFn: async () => {
      if (!tenantId || !visitorId) throw new Error('Missing params');

      const { data, error } = await supabase
        .from('visitor_inductions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('visitor_id', visitorId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!visitorId,
  });
}

export function usePendingVisitorInductions() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-pending-inductions', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('visitor_inductions')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('acknowledged_at', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useVisitorInductionStatus(visitorId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-induction-status', visitorId],
    queryFn: async () => {
      if (!tenantId || !visitorId) throw new Error('Missing params');

      const { data, error } = await supabase
        .from('visitor_inductions')
        .select('id, status, sent_at, viewed_at, acknowledged_at, expires_at')
        .eq('tenant_id', tenantId)
        .eq('visitor_id', visitorId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!visitorId,
  });
}

export function useSendVisitorInduction() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ visitorId, videoId }: { visitorId: string; videoId: string }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase.functions.invoke('send-visitor-induction', {
        body: { visitor_id: visitorId, video_id: videoId, tenant_id: profile.tenant_id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-inductions'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-pending-inductions'] });
      toast({ title: t('visitors.induction.sent', 'Induction sent') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

export function useVisitorHasValidInduction(visitorId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-valid-induction', visitorId],
    queryFn: async () => {
      if (!tenantId || !visitorId) return false;

      const { data, error } = await supabase
        .from('visitor_inductions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('visitor_id', visitorId)
        .not('acknowledged_at', 'is', null)
        .gt('expires_at', new Date().toISOString())
        .is('deleted_at', null)
        .limit(1);

      if (error) throw error;
      return data.length > 0;
    },
    enabled: !!tenantId && !!visitorId,
  });
}

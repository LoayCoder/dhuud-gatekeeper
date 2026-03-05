import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import type { GateEntryFilters, CreateGateEntryParams } from '@/features/security/services/gateQRService';

export function useGateEntries(filters?: GateEntryFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('gate-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gate_entry_logs',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ['gate-entries', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      const { getGateEntries } = await import('@/features/security/services/gateQRService');
      return getGateEntries(tenantId, filters);
    },
    enabled: !!tenantId,
  });
}

export function useCreateGateEntry() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (entry: CreateGateEntryParams) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { createGateEntry } = await import('@/features/security/services/gateQRService');
      return createGateEntry(entry, tenantId, user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
      toast({ title: t('security.gate.entryRecorded', 'Entry recorded successfully') });
    },
    onError: (error) => {
      toast({
        title: t('security.gate.entryFailed', 'Failed to record entry'),
        variant: 'destructive'
      });
      console.error('Gate entry error:', error);
    },
  });
}

export function useRecordExit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { recordExit } = await import('@/features/security/services/gateQRService');
      return recordExit(entryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
      queryClient.invalidateQueries({ queryKey: ['client-site-rep-personnel'] });
      toast({ title: t('security.gate.exitRecorded', 'Exit recorded successfully') });
    },
    onError: (error) => {
      toast({
        title: t('security.gate.exitFailed', 'Failed to record exit'),
        variant: 'destructive'
      });
      console.error('Exit record error:', error);
    },
  });
}

export function useSendWhatsAppNotification() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: {
      entryId: string;
      visitorName: string;
      phoneNumber: string;
      hostName?: string;
      siteName?: string;
      destinationName?: string;
      visitDurationHours?: number;
      notes?: string;
      language?: string;
    }) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { sendGateWhatsAppNotification } = await import('@/features/security/services/gateQRService');
      return sendGateWhatsAppNotification({ ...params, tenantId });
    },
    onSuccess: () => {
      toast({ title: t('security.gate.whatsappSent', 'WhatsApp notification sent') });
    },
    onError: (error) => {
      toast({
        title: t('security.gate.whatsappFailed', 'Failed to send WhatsApp'),
        variant: 'destructive'
      });
      console.error('WhatsApp error:', error);
    },
  });
}


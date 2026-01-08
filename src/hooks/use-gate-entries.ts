import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';

type GateEntryLog = Database['public']['Tables']['gate_entry_logs']['Row'];
type GateEntryInsert = Database['public']['Tables']['gate_entry_logs']['Insert'];

export interface GateEntryFilters {
  search?: string;
  entryType?: string;
  siteId?: string;
  dateFrom?: string;
  dateTo?: string;
  onlyActive?: boolean;
}

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

      let query = supabase
        .from('gate_entry_logs')
        .select(`
          id,
          person_name,
          entry_type,
          entry_time,
          exit_time,
          car_plate,
          mobile_number,
          nationality,
          purpose,
          destination_name,
          notes,
          site_id,
          visitor_id,
          passenger_count,
          created_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('entry_time', { ascending: false });

      if (filters?.search) {
        query = query.or(`person_name.ilike.%${filters.search}%,car_plate.ilike.%${filters.search}%,mobile_number.ilike.%${filters.search}%`);
      }

      if (filters?.entryType) {
        query = query.eq('entry_type', filters.entryType);
      }

      if (filters?.siteId) {
        query = query.eq('site_id', filters.siteId);
      }

      if (filters?.dateFrom) {
        query = query.gte('entry_time', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('entry_time', filters.dateTo);
      }

      if (filters?.onlyActive) {
        query = query.is('exit_time', null);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as GateEntryLog[];
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
    mutationFn: async (entry: Omit<GateEntryInsert, 'tenant_id' | 'guard_id'> & { 
      host_mobile?: string; 
      notify_host?: boolean;
      visit_duration_hours?: number;
      safety_officer_id?: string | null;
      representative_id?: string | null;
    }) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { host_mobile, notify_host, visit_duration_hours, safety_officer_id, representative_id, ...entryData } = entry;

      const { data, error } = await supabase
        .from('gate_entry_logs')
        .insert({
          ...entryData,
          tenant_id: tenantId,
          guard_id: user?.id,
          host_mobile,
          notify_host: notify_host ?? true,
          visit_duration_hours: visit_duration_hours ?? 1,
          safety_officer_id: safety_officer_id || null,
          representative_id: representative_id || null,
        } as GateEntryInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      // First, get the entry to check for linked personnel
      const { data: entry, error: fetchError } = await supabase
        .from('gate_entry_logs')
        .select('id, safety_officer_id, representative_id')
        .eq('id', entryId)
        .single();

      if (fetchError) throw fetchError;

      // Update the exit time
      const { data, error } = await supabase
        .from('gate_entry_logs')
        .update({ exit_time: new Date().toISOString() })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;

      // If linked to a safety officer, update their onsite status
      if (entry?.safety_officer_id) {
        await supabase
          .from('contractor_safety_officers')
          .update({ 
            is_onsite: false, 
            last_exit_at: new Date().toISOString(),
            current_gate_entry_id: null 
          })
          .eq('id', entry.safety_officer_id);
      }

      // If linked to a contractor representative, update their onsite status
      if (entry?.representative_id) {
        await supabase
          .from('contractor_representatives')
          .update({ 
            is_onsite: false, 
            last_exit_at: new Date().toISOString(),
            current_gate_entry_id: null 
          })
          .eq('id', entry.representative_id);
      }

      return data;
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

      const { data, error } = await supabase.functions.invoke('send-gate-whatsapp', {
        body: {
          entry_id: params.entryId,
          mobile_number: params.phoneNumber,
          visitor_name: params.visitorName,
          destination_name: params.destinationName || params.siteName,
          visit_duration_hours: params.visitDurationHours || 1,
          notes: params.notes,
          tenant_id: tenantId,
          language: params.language || 'ar',
        },
      });

      if (error) throw error;
      return data;
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

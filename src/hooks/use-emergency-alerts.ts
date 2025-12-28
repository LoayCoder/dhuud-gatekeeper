import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface EmergencyAlert {
  id: string;
  tenant_id: string;
  guard_id: string | null;
  alert_type: 'panic' | 'duress' | 'medical' | 'fire' | 'security_breach';
  priority: 'critical' | 'high' | 'medium' | 'low';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  location_description: string | null;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  is_false_alarm: boolean;
  response_time_seconds: number | null;
  notes: string | null;
  created_at: string;
  guard?: {
    full_name: string | null;
  };
  acknowledger?: {
    full_name: string | null;
  };
  resolver?: {
    full_name: string | null;
  };
}

export function useEmergencyAlerts(statusFilter?: 'active' | 'acknowledged' | 'resolved' | 'all') {
  return useQuery({
    queryKey: ['emergency-alerts', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('emergency_alerts')
        .select(`
          id,
          tenant_id,
          guard_id,
          alert_type,
          priority,
          latitude,
          longitude,
          accuracy,
          location_description,
          triggered_at,
          acknowledged_at,
          acknowledged_by,
          resolved_at,
          resolved_by,
          resolution_notes,
          is_false_alarm,
          response_time_seconds,
          notes,
          created_at,
          guard:profiles!emergency_alerts_guard_id_fkey(full_name),
          acknowledger:profiles!emergency_alerts_acknowledged_by_fkey(full_name),
          resolver:profiles!emergency_alerts_resolved_by_fkey(full_name)
        `)
        .is('deleted_at', null)
        .order('triggered_at', { ascending: false });

      if (statusFilter === 'active') {
        query = query.is('acknowledged_at', null).is('resolved_at', null);
      } else if (statusFilter === 'acknowledged') {
        query = query.not('acknowledged_at', 'is', null).is('resolved_at', null);
      } else if (statusFilter === 'resolved') {
        query = query.not('resolved_at', 'is', null);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as EmergencyAlert[];
    },
    refetchInterval: 10000,
  });
}

export function useActiveEmergencyAlerts() {
  return useEmergencyAlerts('active');
}

export function useTriggerEmergencyAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      alert_type: 'panic' | 'duress' | 'medical' | 'fire' | 'security_breach';
      priority?: 'critical' | 'high' | 'medium' | 'low';
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      location_description?: string;
      notes?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .single();
      
      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('emergency_alerts')
        .insert({
          tenant_id: profile.tenant_id,
          guard_id: profile.id,
          alert_type: params.alert_type,
          priority: params.priority || 'critical',
          latitude: params.latitude,
          longitude: params.longitude,
          accuracy: params.accuracy,
          location_description: params.location_description,
          notes: params.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
      toast({
        title: 'Emergency Alert Triggered',
        description: 'Help is on the way. Stay calm.',
        variant: 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to trigger alert',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAcknowledgeEmergencyAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .single();

      const alert = await supabase
        .from('emergency_alerts')
        .select('triggered_at')
        .eq('id', alertId)
        .single();

      const responseTime = alert.data?.triggered_at
        ? Math.round((Date.now() - new Date(alert.data.triggered_at).getTime()) / 1000)
        : null;

      const { data, error } = await supabase
        .from('emergency_alerts')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: profile?.id,
          response_time_seconds: responseTime,
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
      toast({ title: 'Alert acknowledged' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to acknowledge alert',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useResolveEmergencyAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { alertId: string; notes: string; isFalseAlarm?: boolean }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .single();

      const { data, error } = await supabase
        .from('emergency_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: profile?.id,
          resolution_notes: params.notes,
          is_false_alarm: params.isFalseAlarm || false,
        })
        .eq('id', params.alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
      toast({ title: 'Alert resolved' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to resolve alert',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRealtimeEmergencyAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('emergency-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
          toast({
            title: '🚨 EMERGENCY ALERT',
            description: `${(payload.new as EmergencyAlert).alert_type.toUpperCase()} alert triggered!`,
            variant: 'destructive',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergency_alerts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
}

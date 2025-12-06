import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';

type Incident = Database['public']['Tables']['incidents']['Row'];
type IncidentInsert = Database['public']['Tables']['incidents']['Insert'];

export interface IncidentFormData {
  title: string;
  description: string;
  event_type: string;
  subtype?: string;
  occurred_at: string;
  location?: string;
  department?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  immediate_actions?: string;
  has_injury: boolean;
  injury_details?: {
    count?: number;
    description?: string;
  };
  has_damage: boolean;
  damage_details?: {
    description?: string;
    estimated_cost?: number;
  };
}

export function useCreateIncident() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: IncidentFormData) => {
      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const insertData: IncidentInsert = {
        tenant_id: profile.tenant_id,
        reporter_id: user.id,
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        subtype: data.subtype || null,
        occurred_at: data.occurred_at,
        location: data.location || null,
        department: data.department || null,
        severity: data.severity || null,
        immediate_actions: data.immediate_actions || null,
        has_injury: data.has_injury,
        injury_details: data.has_injury ? data.injury_details : null,
        has_damage: data.has_damage,
        damage_details: data.has_damage ? data.damage_details : null,
        status: 'submitted',
      };

      const { data: incident, error } = await supabase
        .from('incidents')
        .insert(insertData)
        .select('id, reference_id')
        .single();

      if (error) throw error;
      return incident;
    },
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({
        title: t('incidents.successTitle'),
        description: t('incidents.successMessage', { referenceId: incident.reference_id }),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useIncidents() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['incidents', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('incidents')
        .select('id, reference_id, title, event_type, severity, status, occurred_at, created_at')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Incident[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useIncident(id: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      if (!id || !profile?.tenant_id) return null;

      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as Incident;
    },
    enabled: !!id && !!profile?.tenant_id,
  });
}

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
  // Location fields
  site_id?: string;
  branch_id?: string;
  department_id?: string;
  latitude?: number;
  longitude?: number;
  // Major event linkage
  special_event_id?: string;
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
        // Location fields
        site_id: data.site_id || null,
        branch_id: data.branch_id || null,
        department_id: data.department_id || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        // Major event linkage
        special_event_id: data.special_event_id || null,
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

// Hook to get corrective actions assigned to the current user
export function useMyCorrectiveActions() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-corrective-actions', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('corrective_actions')
        .select('id, title, description, status, priority, due_date, incident_id, created_at, completed_date')
        .eq('assigned_to', user.id)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}

// Hook to update action status (for assigned users)
export function useUpdateMyActionStatus() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      
      // If marking as completed, set the completed_date
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('corrective_actions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast({
        title: t('common.success'),
        description: t('investigation.actionStatusUpdated'),
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

// Hook to update incident status (for HSSE/admin users)
export function useUpdateIncidentStatus() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Database['public']['Enums']['incident_status'] }) => {
      const { error } = await supabase
        .from('incidents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      toast({
        title: t('common.success'),
        description: t('incidents.statusUpdated'),
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

// Hook to soft-delete incident (admin only)
export function useDeleteIncident() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('incidents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({
        title: t('common.success'),
        description: t('incidents.deleteSuccess'),
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

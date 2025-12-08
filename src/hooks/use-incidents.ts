import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';

type Incident = Database['public']['Tables']['incidents']['Row'];
type IncidentInsert = Database['public']['Tables']['incidents']['Insert'];

export interface ClosedOnSpotPayload {
  closed_on_spot: boolean;
  photo_paths?: string[];
}

export interface IncidentFormData {
  title: string;
  description: string;
  event_type: string;
  subtype?: string;
  occurred_at: string;
  location?: string;
  department?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  risk_rating?: 'low' | 'medium' | 'high'; // For observations only
  immediate_actions?: string;
  closed_on_spot_data?: ClosedOnSpotPayload; // For observations closed on the spot
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

      // Determine if this is an observation (simplified workflow)
      const isObservation = data.event_type === 'observation';
      
      const insertData: IncidentInsert & { risk_rating?: string } = {
        tenant_id: profile.tenant_id,
        reporter_id: user.id,
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        subtype: data.subtype || null,
        occurred_at: data.occurred_at,
        location: data.location || null,
        department: data.department || null,
        // Observations use risk_rating, incidents use severity
        severity: isObservation ? null : (data.severity || null),
        immediate_actions: data.immediate_actions || null,
        // Observations don't have injury/damage details
        has_injury: isObservation ? false : data.has_injury,
        injury_details: isObservation ? null : (data.has_injury ? data.injury_details : null),
        has_damage: isObservation ? false : data.has_damage,
        damage_details: isObservation ? null : (data.has_damage ? data.damage_details : null),
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
      
      // Add risk_rating for observations (cast to any to bypass type check for new column)
      if (isObservation && data.risk_rating) {
        (insertData as Record<string, unknown>).risk_rating = data.risk_rating;
      }

      // Add closed_on_spot_data for observations marked as closed on the spot
      if (isObservation && data.closed_on_spot_data) {
        (insertData as Record<string, unknown>).immediate_actions_data = data.closed_on_spot_data;
        // Set status to 'closed' if closed on spot
        if (data.closed_on_spot_data.closed_on_spot) {
          insertData.status = 'closed';
        }
      }

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
        .order('created_at', { ascending: false })
        .range(0, 99); // Limit to first 100 incidents for performance

      if (error) throw error;
      return data as Incident[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 2 * 60 * 1000, // 2 minutes before refetch
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
  });
}

export interface IncidentWithDetails {
  id: string;
  reference_id: string | null;
  title: string;
  description: string;
  event_type: string;
  subtype: string | null;
  occurred_at: string | null;
  location: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  status: 'submitted' | 'pending_review' | 'investigation_pending' | 'investigation_in_progress' | 'closed' | null;
  immediate_actions: string | null;
  has_injury: boolean | null;
  injury_details: Record<string, unknown> | null;
  has_damage: boolean | null;
  damage_details: Record<string, unknown> | null;
  latitude: number | null;
  longitude: number | null;
  media_attachments: unknown[] | null;
  ai_analysis_result: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  tenant_id: string;
  reporter_id: string | null;
  branch_id: string | null;
  site_id: string | null;
  department_id: string | null;
  special_event_id: string | null;
  // Approval workflow fields
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  investigation_locked: boolean | null;
  // Severity tracking fields
  original_severity: 'low' | 'medium' | 'high' | 'critical' | null;
  severity_change_justification: string | null;
  severity_approved_by: string | null;
  severity_approved_at: string | null;
  severity_pending_approval: boolean | null;
  // Joined relations
  reporter?: { id: string; full_name: string | null } | null;
  branch?: { id: string; name: string } | null;
  site?: { id: string; name: string } | null;
  department_info?: { id: string; name: string } | null;
  special_event?: { id: string; name: string } | null;
}

export function useIncident(id: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      if (!id || !profile?.tenant_id) return null;

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, description, event_type, subtype, 
          occurred_at, location, severity, status, immediate_actions,
          has_injury, injury_details, has_damage, damage_details,
          latitude, longitude, media_attachments, ai_analysis_result,
          created_at, updated_at, tenant_id, reporter_id,
          branch_id, site_id, department_id, special_event_id,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name),
          branch:branches!incidents_branch_id_fkey(id, name),
          site:sites!incidents_site_id_fkey(id, name),
          department_info:departments!incidents_department_id_fkey(id, name),
          special_event:special_events!incidents_special_event_id_fkey(id, name)
        `)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      
      // Cast and add new fields that may not be in types yet
      const extended = data as unknown as Record<string, unknown>;
      return {
        ...data,
        approved_by: extended.approved_by ?? null,
        approved_at: extended.approved_at ?? null,
        approval_notes: extended.approval_notes ?? null,
        investigation_locked: extended.investigation_locked ?? false,
        original_severity: extended.original_severity ?? null,
        severity_change_justification: extended.severity_change_justification ?? null,
        severity_approved_by: extended.severity_approved_by ?? null,
        severity_approved_at: extended.severity_approved_at ?? null,
        severity_pending_approval: extended.severity_pending_approval ?? false,
      } as IncidentWithDetails;
    },
    enabled: !!id && !!profile?.tenant_id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
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

// Hook to soft-delete incident (admin only, non-closed incidents)
export function useDeleteIncident() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Use RPC function that bypasses RLS with proper security checks
      const { error } = await supabase
        .rpc('soft_delete_incident', { p_incident_id: id });

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
